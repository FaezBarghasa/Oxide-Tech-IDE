// crates/core/src/cuda_discovery.rs

use crate::errors::{OxideError, OxideResult};
use libloading::{Library, Symbol};
use serde::{Deserialize, Serialize};
use std::ffi::CStr;
use std::os::raw::{c_char, c_int};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CudaDeviceDetails {
    pub index: i32,
    pub name: String,
    pub compute_capability: String,
    pub total_memory_mb: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CudaDiscoveryResult {
    pub is_available: bool,
    pub devices: Vec<CudaDeviceDetails>,
    pub error_message: Option<String>,
}

// Define the necessary CUDA driver API function types for type safety.
type CuInit = unsafe extern "C" fn(u32) -> c_int;
type CuDriverGetVersion = unsafe extern "C" fn(*mut c_int) -> c_int;
type CuDeviceGetCount = unsafe extern "C" fn(*mut c_int) -> c_int;
type CuDeviceGet = unsafe extern "C" fn(*mut c_int, c_int) -> c_int;
type CuDeviceGetName = unsafe extern "C" fn(*mut c_char, c_int, c_int) -> c_int;
type CuDeviceTotalMem = unsafe extern "C" fn(*mut usize, c_int) -> c_int;
// We will add this later to get the compute capability.
// type CuDeviceGetAttribute = unsafe extern "C" fn(*mut c_int, c_int, c_int) -> c_int;

/// Dynamically discovers NVIDIA CUDA devices on the system without a compile-time dependency.
/// This function loads the CUDA driver library (`libcuda.so.1` or `nvcuda.dll`) at runtime.
///
/// # Returns
/// A `CudaDiscoveryResult` struct containing whether CUDA is available, a list of
/// discovered devices, and an optional error message. This function is designed to
/// never panic, providing a graceful fallback for systems without CUDA.
pub fn discover_cuda() -> CudaDiscoveryResult {
    let lib_path = if cfg!(target_os = "windows") {
        "nvcuda.dll"
    } else {
        "libcuda.so.1"
    };

    unsafe {
        match Library::new(lib_path) {
            Ok(lib) => {
                match run_cuda_discovery(lib) {
                    Ok(devices) => CudaDiscoveryResult {
                        is_available: true,
                        devices,
                        error_message: None,
                    },
                    Err(e) => CudaDiscoveryResult {
                        is_available: false,
                        devices: vec![],
                        error_message: Some(e.to_string()),
                    }
                }
            }
            Err(e) => CudaDiscoveryResult {
                is_available: false,
                devices: vec![],
                error_message: Some(format!("Failed to load CUDA library '{}': {}", lib_path, e)),
            },
        }
    }
}

unsafe fn run_cuda_discovery(lib: Library) -> OxideResult<Vec<CudaDeviceDetails>> {
    // 1. Initialize the driver
    let cu_init: Symbol<CuInit> = lib.get(b"cuInit\0")
        .map_err(|e| OxideError::CudaError(format!("Failed to load symbol cuInit: {}", e)))?;
    if cu_init(0) != 0 { // 0 = CUDA_SUCCESS
        return Err(OxideError::CudaError("cuInit call failed".to_string()));
    }

    // 2. Get device count
    let cu_device_get_count: Symbol<CuDeviceGetCount> = lib.get(b"cuDeviceGetCount\0")
        .map_err(|e| OxideError::CudaError(format!("Failed to load symbol cuDeviceGetCount: {}", e)))?;
    let mut count: c_int = 0;
    if cu_device_get_count(&mut count) != 0 {
        return Err(OxideError::CudaError("cuDeviceGetCount call failed".to_string()));
    }
    if count == 0 {
        return Ok(vec![]); // No devices found is not an error.
    }

    // 3. Load symbols for device iteration
    let cu_device_get: Symbol<CuDeviceGet> = lib.get(b"cuDeviceGet\0")
        .map_err(|e| OxideError::CudaError(format!("Failed to load symbol cuDeviceGet: {}", e)))?;
    let cu_device_get_name: Symbol<CuDeviceGetName> = lib.get(b"cuDeviceGetName\0")
        .map_err(|e| OxideError::CudaError(format!("Failed to load symbol cuDeviceGetName: {}", e)))?;
    let cu_device_total_mem: Symbol<CuDeviceTotalMem> = lib.get(b"cuDeviceTotalMem\0")
        .map_err(|e| OxideError::CudaError(format!("Failed to load symbol cuDeviceTotalMem: {}", e)))?;

    // 4. Iterate and collect device details
    let mut devices = Vec::with_capacity(count as usize);
    for i in 0..count {
        let mut device_handle: c_int = 0;
        if cu_device_get(&mut device_handle, i) != 0 { continue; }

        let mut name_buffer = [0 as c_char; 128];
        if cu_device_get_name(name_buffer.as_mut_ptr(), name_buffer.len() as c_int, device_handle) != 0 { continue; }
        let name = CStr::from_ptr(name_buffer.as_ptr()).to_string_lossy().into_owned();

        let mut total_mem: usize = 0;
        if cu_device_total_mem(&mut total_mem, device_handle) != 0 { continue; }

        devices.push(CudaDeviceDetails {
            index: i,
            name,
            // Placeholder. Getting compute capability requires more calls (cuDeviceGetAttribute).
            // This can be added later without breaking the existing structure.
            compute_capability: "N/A".to_string(),
            total_memory_mb: (total_mem as u64) / (1024 * 1024),
        });
    }

    Ok(devices)
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_discover_cuda_gracefully() {
        let result = discover_cuda();
        println!("CUDA Discovery Result: {:?}", result);

        // This test should never panic, regardless of whether CUDA is installed.
        if result.is_available {
            // If CUDA is available, we might have devices or not.
            // An error message is only present if something went wrong after lib loading.
            if result.devices.is_empty() {
                 println!("CUDA driver loaded, but no devices found.");
            } else {
                println!("Found {} CUDA devices.", result.devices.len());
                let device = &result.devices[0];
                assert!(device.index >= 0);
                assert!(!device.name.is_empty());
                assert!(device.total_memory_mb > 0);
                assert_eq!(device.compute_capability, "N/A");
            }
        } else {
            // If CUDA is not available, there must be an error message.
            assert!(result.error_message.is_some());
            assert!(result.devices.is_empty());
            println!("CUDA not available: {}", result.error_message.unwrap());
        }
    }
}
