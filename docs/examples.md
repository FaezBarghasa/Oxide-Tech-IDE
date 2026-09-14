# Oxide Tech IDE — Code Examples & Usage Recipes

## 1. Embedded STM32 Firmware Development (`no_std`)

### 1.1 Async STM32F4 UART & GPIO with Embassy

```rust
#![no_std]
#![no_main]

use defmt::*;
use embassy_executor::Spawner;
use embassy_stm32::gpio::{Level, Output, Speed};
use embassy_time::Timer;
use {defmt_rtt as _, panic_probe as _};

#[embassy_executor::main]
async fn main(_spawner: Spawner) {
    let p = embassy_stm32::init(Default::default());
    info!("Oxide Tech IDE: STM32F407VG Firmware Initialized!");

    let mut led = Output::new(p.PD12, Level::Low, Speed::Low);

    loop {
        info!("Toggling onboard LED (PD12)...");
        led.set_high();
        Timer::after_millis(500).await;
        led.set_low();
        Timer::after_millis(500).await;
    }
}
```

---

## 2. Declarative Slint UI Design

### 2.1 Slint Reactive Dashboard Markup

```slint
import { Button, VerticalBox, HorizontalBox, Slider } from "std-widgets.slint";

export component SensorDashboard inherits Window {
    width: 480px;
    height: 320px;
    background: #1e1f22;

    in-out property <float> temperature: 24.5;
    in-out property <float> target_temp: 22.0;
    callback adjust_target(float);

    VerticalBox {
        padding: 16px;
        spacing: 12px;

        Text {
            text: "Oxide Hardware Telemetry";
            font-size: 16px;
            font-weight: 700;
            color: #dfe1e5;
            horizontal-alignment: center;
        }

        HorizontalBox {
            Text {
                text: "Current Temp: " + root.temperature + " °C";
                color: #59a869;
                font-size: 14px;
            }
        }

        Slider {
            minimum: 10.0;
            maximum: 40.0;
            value: root.target_temp;
            changed(val) => {
                root.adjust_target(val);
            }
        }
    }
}
```

---

## 3. Desktop Application with Iced Native GUI

### 3.1 Counter Application with Hot Reload

```rust
use iced::widget::{button, column, container, text};
use iced::{Alignment, Element, Length, Sandbox, Settings};

pub fn main() -> iced::Result {
    Counter::run(Settings::default())
}

#[derive(Default)]
struct Counter {
    value: i32,
}

#[derive(Debug, Clone, Copy)]
enum Message {
    Increment,
    Decrement,
}

impl Sandbox for Counter {
    type Message = Message;

    fn new() -> Self {
        Self::default()
    }

    fn title(&self) -> String {
        String::from("Oxide Tech IDE - Iced Hot Reload Demo")
    }

    fn update(&mut self, message: Message) {
        match message {
            Message::Increment => self.value += 1,
            Message::Decrement => self.value -= 1,
        }
    }

    fn view(&self) -> Element<Message> {
        container(
            column![
                button("Increment").on_press(Message::Increment),
                text(self.value).size(32),
                button("Decrement").on_press(Message::Decrement),
            ]
            .spacing(16)
            .align_items(Alignment::Center),
        )
        .width(Length::Fill)
        .height(Length::Fill)
        .center_x()
        .center_y()
        .into()
    }
}
```

---

## 4. Playwright Visual Regression Testing

### 4.1 UI Baseline Snapshot Assertion

```typescript
import { test, expect } from '@playwright/test';

test.describe('Oxide Tech IDE Visual Parity', () => {
  test('Main docking layout matches JetBrains dark theme baseline', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForSelector('.flexlayout__layout');

    // Take visual regression screenshot
    await expect(page).toHaveScreenshot('rustrover-layout-baseline.png', {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    });
  });

  test('Search Everywhere overlay opens on double shift', async ({ page }) => {
    await page.goto('http://localhost:1420?overlay=search-everywhere');
    const overlay = page.locator('input[placeholder*="Search everywhere"]');
    await expect(overlay).toBeVisible();
  });
});
```
