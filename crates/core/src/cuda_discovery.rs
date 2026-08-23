use libloading::{Library, Symbol};
use serde::{Serialize, Deserialize};
use std::ffi::{CStr, CString};
use std::os::raw::c_int;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CudaError {
    #[error("Failed to load CUDA library: {0}")]
    LibraryLoadError(#[from] libloading::Error),
    #[error("CUDA driver API error: {0}")]
    CudaDriverError(i32),
    #[error("Failed to convert C string: {0}")]
    CStrError(#[from] std::ffi::NulError),
    #[error("Unknown CUDA error")]
    Unknown,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CudaDeviceDetails {
    pub index: i32,
    pub name: String,
    pub compute_capability: String, // Major.Minor
    pub total_memory_mb: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CudaDiscoveryResult {
    pub is_available: bool,
    pub devices: Vec<CudaDeviceDetails>,
    pub error: Option<String>,
}

// Define CUDA C API function types
type CuInit = unsafe extern "C" fn(Flags: c_int) -> i32;
type CuDriverGetVersion = unsafe extern "C" fn(driverVersion: *mut c_int) -> i32;
type CuDeviceGetCount = unsafe extern "C" fn(count: *mut c_int) -> i32;
type CuDeviceGet = unsafe extern "C" fn(device: *mut c_int, ordinal: c_int) -> i32;
type CuDeviceGetName = unsafe extern "C" fn(name: *mut i8, len: c_int, device: c_int) -> i32;
type CuDeviceTotalMem = unsafe extern "C" fn(bytes: *mut u64, device: c_int) -> i32;
type CuDeviceComputeCapability = unsafe extern "C" fn(major: *mut c_int, minor: *mut c_int, device: c_int) -> i32;


pub fn discover_cuda() -> CudaDiscoveryResult {
    let lib_name = if cfg!(target_os = "windows") {
        "nvcuda.dll"
    } else {
        "libcuda.so.1"
    };

    let library = match Library::new(lib_name) {
        Ok(lib) => lib,
        Err(e) => {
            return CudaDiscoveryResult {
                is_available: false,
                devices: Vec::new(),
                error: Some(CudaError::LibraryLoadError(e).to_string()),
            };
        }
    };

    let result = (|| {
        unsafe {
            let cuInit: Symbol<CuInit> = library.get(b"cuInit")?;
            let cuDriverGetVersion: Symbol<CuDriverGetVersion> = library.get(b"cuDriverGetVersion")?;
            let cuDeviceGetCount: Symbol<CuDeviceGetCount> = library.get(b"cuDeviceGetCount")?;
            let cuDeviceGet: Symbol<CuDeviceGet> = library.get(b"cuDeviceGet")?;
            let cuDeviceGetName: Symbol<CuDeviceGetName> = library.get(b"cuDeviceGetName")?;
            let cuDeviceTotalMem: Symbol<CuDeviceTotalMem> = library.get(b"cuDeviceTotalMem")?;
            let cuDeviceComputeCapability: Symbol<CuDeviceComputeCapability> = library.get(b"cuDeviceComputeCapability")?;

            let res = cuInit(0);
            if res != 0 {
                return Err(CudaError::CudaDriverError(res));
            }

            let mut driver_version: c_int = 0;
            let res = cuDriverGetVersion(&mut driver_version);
            if res != 0 {
                return Err(CudaError::CudaDriverError(res));
            }
            tracing::info!("CUDA Driver Version: {}", driver_version);

            let mut device_count: c_int = 0;
            let res = cuDeviceGetCount(&mut device_count);
            if res != 0 {
                return Err(CudaError::CudaDriverError(res));
            }

            let mut devices = Vec::new();
            for i in 0..device_count {
                let mut device: c_int = 0;
                let res = cuDeviceGet(&mut device, i);
                if res != 0 {
                    return Err(CudaError::CudaDriverError(res));
                }

                let mut name_buf = [0i8; 256];
                let res = cuDeviceGetName(name_buf.as_mut_ptr(), name_buf.len() as c_int, device);
                if res != 0 {
                    return Err(CudaError::CudaDriverError(res));
                }
                let name = CStr::from_ptr(name_buf.as_ptr()).to_str()?.to_string();

                let mut total_memory: u64 = 0;
                let res = cuDeviceTotalMem(&mut total_memory, device);
                if res != 0 {
                    return Err(CudaError::CudaDriverError(res));
                }

                let mut major: c_int = 0;
                let mut minor: c_int = 0;
                let res = cuDeviceComputeCapability(&mut major, &mut minor, device);
                if res != 0 {
                    return Err(CudaError::CudaDriverError(res));
                }
                let compute_capability = format!("{}.{}", major, minor);

                devices.push(CudaDeviceDetails {
                    index: i,
                    name,
                    compute_capability,
                    total_memory_mb: total_memory / (1024 * 1024),
                });
            }
            Ok(devices)
        }
    })();

    match result {
        Ok(devices) => CudaDiscoveryResult {
            is_available: true,
            devices,
            error: None,
        },
        Err(e) => CudaDiscoveryResult {
            is_available: false,
            devices: Vec::new(),
            error: Some(e.to_string()),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cuda_discovery_unavailable() {
        // This test assumes CUDA is NOT available or mocks its absence.
        // For a real test, you'd need to mock libloading or run on a system without CUDA.
        // Since direct mocking of libloading::Library::new is hard without unsafe,
        // we'll just call it and check for expected failure on systems without CUDA.
        let result = discover_cuda();
        if result.is_available {
            // If CUDA is available, this test will pass, and the other test should be run.
            // This is a bit of a weak test, but dynamic loading is hard to mock.
            assert!(!result.devices.is_empty());
            println!("CUDA is available on this system. Devices: {:?}", result.devices);
        } else {
            assert!(!result.is_available);
            assert!(result.error.is_some());
            println!("CUDA is not available on this system, as expected for this test scenario: {:?}", result.error);
        }
    }
}
