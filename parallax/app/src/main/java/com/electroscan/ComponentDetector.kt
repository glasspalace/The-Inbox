package com.electroscan

/**
 * Maps component keywords → known electronic components.
 *
 * Keywords come from two sources:
 *  1. Claude Vision API — rich, specific labels like "arduino uno", "electrolytic
 *     capacitor", "hc-sr04", "dupont wire". This is the primary source.
 *  2. ML Kit fallback — generic on-device labels. These are filtered heavily
 *     upstream in ScanViewModel before reaching here.
 *
 * The keyword lists are broader than before to capture the variety of ways
 * Claude may phrase a component name while staying precise enough to avoid
 * false positives from vague terms.
 */
object ComponentDetector {

    data class DetectedComponent(
        val name: String,
        val icon: String,
        val confidence: Float,
        val category: ComponentCategory
    )

    enum class ComponentCategory {
        MICROCONTROLLER, POWER, PASSIVE, ACTIVE, SENSOR, DISPLAY, CONNECTIVITY, TOOL, WIRE
    }

    // Each entry: (keywords, display name, category)
    // A label matches if any keyword is a SUBSTRING of the (lowercased) label.
    private val LABEL_MAP: List<Triple<List<String>, String, ComponentCategory>> = listOf(

        // ── Microcontrollers / Dev Boards ─────────────────────────────────────
        Triple(
            listOf(
                "arduino", "atmega", "microcontroller", "circuit board", "pcb",
                "printed circuit", "dev board", "development board", "uno", "nano",
                "mega", "leonardo", "pro mini", "pro micro"
            ),
            "Arduino/Dev Board", ComponentCategory.MICROCONTROLLER
        ),
        Triple(
            listOf("raspberry pi", "raspi", "rpi", "single board computer"),
            "Raspberry Pi", ComponentCategory.MICROCONTROLLER
        ),
        Triple(
            listOf(
                "esp8266", "esp32", "esp-32", "esp-8266", "nodemcu",
                "wifi module", "wemos", "lolin"
            ),
            "ESP WiFi Module", ComponentCategory.MICROCONTROLLER
        ),
        Triple(
            listOf("stm32", "bluepill", "blackpill", "nucleo"),
            "STM32 Board", ComponentCategory.MICROCONTROLLER
        ),

        // ── Power ─────────────────────────────────────────────────────────────
        Triple(
            listOf(
                "battery", "9v battery", "aa battery", "aaa battery",
                "lithium battery", "alkaline", "battery holder", "lipo", "li-ion"
            ),
            "Battery", ComponentCategory.POWER
        ),
        Triple(
            listOf(
                "power supply", "dc adapter", "usb power", "voltage regulator",
                "buck converter", "boost converter", "7805", "lm7805", "lm317",
                "step-down", "step-up"
            ),
            "Power Supply/Regulator", ComponentCategory.POWER
        ),

        // ── Passive Components ────────────────────────────────────────────────
        Triple(
            listOf(
                "resistor", "carbon film", "wire wound", "metal film resistor",
                "through-hole resistor", "colour band", "color band", "ohm resistor"
            ),
            "Resistor", ComponentCategory.PASSIVE
        ),
        Triple(
            listOf(
                "capacitor", "electrolytic", "ceramic capacitor", "tantalum",
                "polyester capacitor", "mylar", "electrolytic cap", "aluminium cap",
                "104", "decoupling cap"
            ),
            "Capacitor", ComponentCategory.PASSIVE
        ),
        Triple(
            listOf(
                "inductor", "coil", "toroidal", "transformer", "ferrite",
                "choke", "inductance"
            ),
            "Inductor/Coil", ComponentCategory.PASSIVE
        ),
        Triple(
            listOf(
                "potentiometer", "pot ", "variable resistor", "trimmer",
                "trimpot", "rotary potentiometer", "linear pot"
            ),
            "Potentiometer", ComponentCategory.PASSIVE
        ),
        Triple(
            listOf(
                "crystal oscillator", "quartz crystal", "crystal resonator",
                "oscillator crystal", "xtal", "hc-49", "smd crystal"
            ),
            "Crystal Oscillator", ComponentCategory.PASSIVE
        ),
        Triple(
            listOf("diode", "1n4007", "1n4148", "schottky", "zener diode", "rectifier diode"),
            "Diode", ComponentCategory.PASSIVE
        ),

        // ── Active Components ─────────────────────────────────────────────────
        Triple(
            listOf(
                "led", "light emitting diode", "light-emitting diode",
                "green led", "red led", "blue led", "yellow led", "white led",
                "rgb led", "led lamp", "led indicator"
            ),
            "LED", ComponentCategory.ACTIVE
        ),
        Triple(
            listOf(
                "transistor", "mosfet", "bjt", "npn", "pnp",
                "2n3904", "2n2222", "bc547", "bc557", "tip120", "tip122",
                "irf520", "irf540", "n-channel", "p-channel"
            ),
            "Transistor", ComponentCategory.ACTIVE
        ),
        Triple(
            listOf(
                "relay", "electromagnetic relay", "5v relay", "12v relay",
                "spdt relay", "spst relay", "relay module"
            ),
            "Relay", ComponentCategory.ACTIVE
        ),
        Triple(
            listOf(
                "integrated circuit", "ic chip", "dip package", "dip ic",
                "smd ic", "ne555", "lm741", "lm358", "lm393", "74hc",
                "74ls", "op-amp", "opamp", "555 timer", "logic gate",
                "shift register", "sn7", "cd40", "mcp", "pic"
            ),
            "IC Chip", ComponentCategory.ACTIVE
        ),
        Triple(
            listOf(
                "buzzer", "piezo", "piezoelectric", "active buzzer",
                "passive buzzer", "beeper", "speaker module"
            ),
            "Buzzer/Speaker", ComponentCategory.ACTIVE
        ),
        Triple(
            listOf(
                "dc motor", "servo motor", "servo", "stepper motor",
                "motor driver", "l298n", "l293d", "sg90", "mg996"
            ),
            "Motor", ComponentCategory.ACTIVE
        ),
        Triple(
            listOf(
                "button", "push button", "tactile switch", "tactile button",
                "momentary switch", "6x6 button", "momentary push"
            ),
            "Push Button", ComponentCategory.ACTIVE
        ),
        Triple(
            listOf("switch", "toggle switch", "slide switch", "rocker switch", "spst", "dpdt"),
            "Switch", ComponentCategory.ACTIVE
        ),

        // ── Sensors ───────────────────────────────────────────────────────────
        Triple(
            listOf(
                "photoresistor", "ldr", "light dependent", "photodiode",
                "photo resistor", "light sensor", "photocell"
            ),
            "Light Sensor (LDR)", ComponentCategory.SENSOR
        ),
        Triple(
            listOf(
                "thermistor", "temperature sensor", "ntc", "ptc",
                "lm35", "ds18b20", "dht11", "dht22", "am2302",
                "tmp36", "temperature module"
            ),
            "Temperature Sensor", ComponentCategory.SENSOR
        ),
        Triple(
            listOf(
                "ultrasonic sensor", "hc-sr04", "hcsr04", "ping sensor",
                "distance sensor", "sonar", "ultrasonic module",
                "ultrasonic transducer", "two cylinder"
            ),
            "Ultrasonic Sensor", ComponentCategory.SENSOR
        ),
        Triple(
            listOf(
                "mpu-6050", "mpu6050", "imu module", "gyroscope module",
                "accelerometer module", "6-axis", "6dof", "mpu 6050",
                "inertial measurement", "gy-521"
            ),
            "IMU/Gyro Sensor", ComponentCategory.SENSOR
        ),
        Triple(
            listOf(
                "ir sensor", "infrared sensor", "ir receiver", "infrared receiver",
                "ir module", "ir led", "tsop", "infrared detector"
            ),
            "IR Sensor", ComponentCategory.SENSOR
        ),
        Triple(
            listOf(
                "joystick", "thumbstick", "analog joystick", "joystick module"
            ),
            "Joystick", ComponentCategory.SENSOR
        ),
        Triple(
            listOf(
                "humidity sensor", "moisture sensor", "soil sensor",
                "capacitive moisture", "hygrometer"
            ),
            "Humidity/Moisture Sensor", ComponentCategory.SENSOR
        ),

        // ── Display ───────────────────────────────────────────────────────────
        Triple(
            listOf(
                "lcd display", "lcd screen", "lcd module", "16x2", "20x4",
                "character lcd", "1602", "2004", "lcd 1602"
            ),
            "LCD Display", ComponentCategory.DISPLAY
        ),
        Triple(
            listOf(
                "oled display", "oled screen", "0.96 oled", "1.3 oled",
                "ssd1306", "i2c oled", "oled module"
            ),
            "OLED Display", ComponentCategory.DISPLAY
        ),
        Triple(
            listOf(
                "seven segment display", "7 segment display", "7-segment",
                "digit display", "numeric display", "segment display"
            ),
            "7-Segment Display", ComponentCategory.DISPLAY
        ),
        Triple(
            listOf(
                "tft display", "ili9341", "st7735", "2.4 tft", "2.8 tft",
                "tft lcd", "colour display"
            ),
            "TFT Display", ComponentCategory.DISPLAY
        ),

        // ── Connectivity ──────────────────────────────────────────────────────
        Triple(
            listOf(
                "bluetooth module", "hc-05", "hc-06", "hc05", "hc06",
                "bluetooth serial", "ble module", "at-09"
            ),
            "Bluetooth Module", ComponentCategory.CONNECTIVITY
        ),
        Triple(
            listOf(
                "nrf24l01", "nrf24", "rf module", "433mhz", "433 mhz",
                "radio module", "wireless module"
            ),
            "RF Wireless Module", ComponentCategory.CONNECTIVITY
        ),

        // ── Prototyping Tools ─────────────────────────────────────────────────
        Triple(
            listOf(
                "breadboard", "solderless breadboard", "prototyping board",
                "proto board", "breadboard holes", "tie strip"
            ),
            "Breadboard", ComponentCategory.TOOL
        ),

        // ── Wires / Connectors ────────────────────────────────────────────────
        Triple(
            listOf(
                "wire", "jumper wire", "dupont wire", "jumper cable",
                "jumper lead", "connecting wire", "female-to-female", "male-to-male",
                "male-to-female", "female to male", "patch wire"
            ),
            "Jumper Wires", ComponentCategory.WIRE
        ),
        Triple(
            listOf("pin header", "female header", "male header", "berg strip", "2.54mm header"),
            "Pin Headers", ComponentCategory.WIRE
        ),
    )

    fun parseLabels(labels: List<Pair<String, Float>>): List<DetectedComponent> {
        val found = mutableMapOf<String, DetectedComponent>()

        for ((labelText, confidence) in labels) {
            val lower = labelText.lowercase()
            for ((keywords, componentName, category) in LABEL_MAP) {
                if (keywords.any { lower.contains(it) }) {
                    val existing = found[componentName]
                    if (existing == null || confidence > existing.confidence) {
                        found[componentName] = DetectedComponent(
                            name       = componentName,
                            icon       = categoryIcon(category),
                            confidence = confidence,
                            category   = category
                        )
                    }
                    break
                }
            }
        }

        return found.values.sortedByDescending { it.confidence }
    }

    private fun categoryIcon(cat: ComponentCategory) = when (cat) {
        ComponentCategory.MICROCONTROLLER -> "🔲"
        ComponentCategory.POWER          -> "🔋"
        ComponentCategory.PASSIVE        -> "〰️"
        ComponentCategory.ACTIVE         -> "💡"
        ComponentCategory.SENSOR         -> "📡"
        ComponentCategory.DISPLAY        -> "🖥️"
        ComponentCategory.CONNECTIVITY   -> "📶"
        ComponentCategory.TOOL           -> "🔧"
        ComponentCategory.WIRE           -> "🔌"
    }
}
