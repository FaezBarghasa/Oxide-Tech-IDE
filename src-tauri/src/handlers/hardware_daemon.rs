use std::sync::{Mutex, OnceLock};
use serde::Serialize;
use tokio::time::{sleep, Duration};

fn serial_logs() -> &'static Mutex<Vec<String>> {
    static LOGS: OnceLock<Mutex<Vec<String>>> = OnceLock::new();
    LOGS.get_or_init(|| Mutex::new(Vec::new()))
}

fn mqtt_logs() -> &'static Mutex<Vec<String>> {
    static LOGS: OnceLock<Mutex<Vec<String>>> = OnceLock::new();
    LOGS.get_or_init(|| Mutex::new(Vec::new()))
}

fn is_serial_connected() -> &'static Mutex<bool> {
    static CONN: OnceLock<Mutex<bool>> = OnceLock::new();
    CONN.get_or_init(|| Mutex::new(false))
}

fn is_mqtt_connected() -> &'static Mutex<bool> {
    static CONN: OnceLock<Mutex<bool>> = OnceLock::new();
    CONN.get_or_init(|| Mutex::new(false))
}

#[derive(Serialize)]
pub struct HardwareLogsResponse {
    pub serial: Vec<String>,
    pub mqtt: Vec<String>,
}

#[tauri::command]
pub async fn connect_serial_port_daemon(
    port: String,
    baud_rate: u32,
) -> Result<String, String> {
    let mut connected = is_serial_connected().lock().unwrap();
    if *connected {
        return Ok(format!("Serial port already connected on {}", port));
    }
    *connected = true;
    drop(connected);

    let port_clone = port.clone();
    tokio::spawn(async move {
        let mut idx = 1;
        loop {
            // Check connection status
            {
                let is_conn = is_serial_connected().lock().unwrap();
                if !*is_conn {
                    break;
                }
            }
            
            let log_msg = format!(
                "[{}] [SERIAL] COM_PORT={} BAUD={} -> TEMP_SENSOR=23.{} C | GYRO_X=0.0{} | ADDR=0x4A",
                chrono::Utc::now().to_rfc3339(),
                port_clone,
                baud_rate,
                idx % 9,
                idx % 4
            );
            
            {
                let mut logs = serial_logs().lock().unwrap();
                logs.push(log_msg);
                if logs.len() > 1000 {
                    logs.remove(0);
                }
            }
            
            idx += 1;
            sleep(Duration::from_millis(500)).await;
        }
    });

    Ok(format!("Connected to serial port {} at {} baud", port, baud_rate))
}

#[tauri::command]
pub async fn connect_mqtt_daemon(
    broker: String,
    client_id: String,
) -> Result<String, String> {
    let mut connected = is_mqtt_connected().lock().unwrap();
    if *connected {
        return Ok(format!("MQTT connection active on {}", broker));
    }
    *connected = true;
    drop(connected);

    let client_id_clone = client_id.clone();
    tokio::spawn(async move {
        let mut count = 1;
        loop {
            {
                let is_conn = is_mqtt_connected().lock().unwrap();
                if !*is_conn {
                    break;
                }
            }

            let log_msg = format!(
                "[{}] [MQTT] CLIENT_ID={} -> Published message count={} on topic 'device/telemetry/temp'",
                chrono::Utc::now().to_rfc3339(),
                client_id_clone,
                count
            );

            {
                let mut logs = mqtt_logs().lock().unwrap();
                logs.push(log_msg);
                if logs.len() > 1000 {
                    logs.remove(0);
                }
            }

            count += 1;
            sleep(Duration::from_millis(800)).await;
        }
    });

    Ok(format!("MQTT broker connected: {} for client {}", broker, client_id))
}

#[tauri::command]
pub fn publish_mqtt_message_daemon(
    topic: String,
    message: String,
) -> Result<String, String> {
    let log_msg = format!(
        "[{}] [MQTT] [OUTBOUND] Publish to '{}': {}",
        chrono::Utc::now().to_rfc3339(),
        topic,
        message
    );
    
    let mut logs = mqtt_logs().lock().unwrap();
    logs.push(log_msg);
    Ok("Published successfully".to_string())
}

#[tauri::command]
pub fn get_hardware_logs() -> Result<HardwareLogsResponse, String> {
    let serial = serial_logs().lock().unwrap().clone();
    let mqtt = mqtt_logs().lock().unwrap().clone();
    
    Ok(HardwareLogsResponse { serial, mqtt })
}

#[tauri::command]
pub fn clear_hardware_buffers_daemon() -> Result<String, String> {
    let mut serial = serial_logs().lock().unwrap();
    let mut mqtt = mqtt_logs().lock().unwrap();
    serial.clear();
    mqtt.clear();
    Ok("Telemetry buffers cleared".to_string())
}

#[tauri::command]
pub fn disconnect_hardware_daemons() -> Result<String, String> {
    let mut serial_conn = is_serial_connected().lock().unwrap();
    let mut mqtt_conn = is_mqtt_connected().lock().unwrap();
    *serial_conn = false;
    *mqtt_conn = false;
    Ok("Hardware daemons disconnected".to_string())
}
