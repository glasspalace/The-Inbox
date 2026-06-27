package com.electroscan

import com.electroscan.ComponentDetector.ComponentCategory
import com.electroscan.ComponentDetector.DetectedComponent

/**
 * Pure Kotlin rule engine — no AI, no internet.
 * Matches detected components against a handcrafted project database
 * and returns ranked, buildable projects with full instructions.
 */
object ProjectMatcher {

    enum class Difficulty(val label: String, val color: Int) {
        BEGINNER("Beginner", 0xFF4CAF50.toInt()),
        INTERMEDIATE("Intermediate", 0xFFFF9800.toInt()),
        ADVANCED("Advanced", 0xFFF44336.toInt())
    }

    data class ProjectStep(
        val number: Int,
        val title: String,
        val detail: String
    )

    data class Project(
        val id: String,
        val name: String,
        val emoji: String,
        val tagline: String,
        val difficulty: Difficulty,
        val estimatedTime: String,
        val requiredComponents: List<String>,        // components needed
        val optionalComponents: List<String> = emptyList(),
        val steps: List<ProjectStep>,
        val learningOutcomes: List<String>,
        val matchScore: Int = 0                      // computed at runtime
    )

    // ─── Project Database ────────────────────────────────────────────────────────

    private val ALL_PROJECTS = listOf(

        // ── BEGINNER ───────────────────────────────────────────────────────────

        Project(
            id = "led_blink",
            name = "LED Blinker",
            emoji = "💡",
            tagline = "Your very first Arduino program — make an LED blink every second",
            difficulty = Difficulty.BEGINNER,
            estimatedTime = "15 min",
            requiredComponents = listOf("Arduino/Dev Board", "LED", "Resistor"),
            optionalComponents = listOf("Breadboard", "Jumper Wires"),
            steps = listOf(
                ProjectStep(1, "Wire the circuit", "Connect a 220Ω resistor to Arduino pin 13. Connect the long leg (anode) of the LED to the resistor's other end, short leg (cathode) to GND pin."),
                ProjectStep(2, "Open Arduino IDE", "Go to File → Examples → 01.Basics → Blink. This sketch is pre-loaded."),
                ProjectStep(3, "Upload", "Select your board (Tools → Board → Arduino Uno) and port, then click Upload (→ arrow)."),
                ProjectStep(4, "See it blink!", "The LED blinks on for 1 second, off for 1 second. Change the delay(1000) values to change speed.")
            ),
            learningOutcomes = listOf("Digital output pins", "Arduino IDE upload flow", "LED + resistor circuit basics")
        ),

        Project(
            id = "led_traffic_light",
            name = "LED Traffic Light",
            emoji = "🚦",
            tagline = "Simulate a 3-colour traffic light sequence with timing control",
            difficulty = Difficulty.BEGINNER,
            estimatedTime = "30 min",
            requiredComponents = listOf("Arduino/Dev Board", "LED", "Resistor", "Breadboard"),
            optionalComponents = listOf("Jumper Wires"),
            steps = listOf(
                ProjectStep(1, "Set up 3 LEDs", "Place red, yellow, and green LEDs on the breadboard. Connect each through a 220Ω resistor to pins 11, 12, 13 respectively. All cathodes → GND rail."),
                ProjectStep(2, "Write the sketch", "In setup(), set pins 11/12/13 as OUTPUT. In loop(), turn red on (4 sec), then yellow (1 sec), then green (3 sec), yellow again (1 sec), repeat."),
                ProjectStep(3, "Code pattern", "digitalWrite(RED, HIGH); delay(4000); digitalWrite(RED, LOW); … repeat the pattern for each colour."),
                ProjectStep(4, "Upload & watch", "Upload and watch the realistic traffic sequence. Try adding a pedestrian button using digitalRead().")
            ),
            learningOutcomes = listOf("Multiple output pins", "Timing with delay()", "Real-world simulation logic")
        ),

        Project(
            id = "button_led",
            name = "Push Button LED Toggle",
            emoji = "🔘",
            tagline = "Press a button to turn an LED on and off — learn digital input",
            difficulty = Difficulty.BEGINNER,
            estimatedTime = "20 min",
            requiredComponents = listOf("Arduino/Dev Board", "LED", "Resistor", "Push Button"),
            optionalComponents = listOf("Breadboard", "Jumper Wires"),
            steps = listOf(
                ProjectStep(1, "Wire button", "Connect one leg of the button to pin 2, other leg to GND. Use INPUT_PULLUP mode — no external resistor needed."),
                ProjectStep(2, "Wire LED", "LED anode → 220Ω resistor → pin 13. Cathode → GND."),
                ProjectStep(3, "Read and write", "In loop(): int state = digitalRead(2); if (state == LOW) { digitalWrite(13, HIGH); } else { digitalWrite(13, LOW); }"),
                ProjectStep(4, "Upgrade: toggle", "Add a boolean variable 'ledOn'. Flip it each time the button is pressed (detect falling edge) for a true toggle behaviour.")
            ),
            learningOutcomes = listOf("Digital input with pull-up", "Debouncing buttons", "State machines")
        ),

        Project(
            id = "buzzer_melody",
            name = "Buzzer Melody Player",
            emoji = "🎵",
            tagline = "Play simple tones and melodies using a piezo buzzer",
            difficulty = Difficulty.BEGINNER,
            estimatedTime = "20 min",
            requiredComponents = listOf("Arduino/Dev Board", "Buzzer/Speaker"),
            optionalComponents = listOf("Resistor", "Push Button"),
            steps = listOf(
                ProjectStep(1, "Connect buzzer", "Positive leg of buzzer → pin 8. Negative → GND. For passive buzzers, you need tone(); active buzzers just need HIGH/LOW."),
                ProjectStep(2, "Play a tone", "tone(8, 440, 500); // 440 Hz (note A) for 500ms. delay(600); to give a gap between notes."),
                ProjectStep(3, "Define a melody", "Create int melody[] = {262, 294, 330, 349, 392}; // C D E F G notes. Loop through with tone() calls."),
                ProjectStep(4, "Add a trigger", "Wire a push button — play the melody only when pressed. Great for a doorbell!")
            ),
            learningOutcomes = listOf("tone() function", "PWM frequency control", "Arrays in Arduino")
        ),

        Project(
            id = "potentiometer_led",
            name = "Dimmer Switch (PWM)",
            emoji = "🌗",
            tagline = "Use a potentiometer knob to smoothly dim an LED brightness",
            difficulty = Difficulty.BEGINNER,
            estimatedTime = "25 min",
            requiredComponents = listOf("Arduino/Dev Board", "LED", "Resistor", "Potentiometer"),
            steps = listOf(
                ProjectStep(1, "Wire pot", "Outer legs of potentiometer → 5V and GND. Middle wiper leg → A0 (analog input)."),
                ProjectStep(2, "Wire LED", "LED → 220Ω resistor → pin 9 (must be a PWM pin, marked ~)."),
                ProjectStep(3, "Map reading to brightness", "int raw = analogRead(A0); // 0–1023. int brightness = map(raw, 0, 1023, 0, 255); analogWrite(9, brightness);"),
                ProjectStep(4, "Turn the knob", "Upload and twist — LED brightness follows the knob smoothly. Open Serial Monitor to print the raw values.")
            ),
            learningOutcomes = listOf("Analog input", "PWM output", "map() function", "analogRead/analogWrite")
        ),

        // ── INTERMEDIATE ───────────────────────────────────────────────────────

        Project(
            id = "ldr_night_light",
            name = "Automatic Night Light",
            emoji = "🌙",
            tagline = "LED turns on automatically when the room gets dark",
            difficulty = Difficulty.INTERMEDIATE,
            estimatedTime = "40 min",
            requiredComponents = listOf("Arduino/Dev Board", "LED", "Resistor", "Light Sensor (LDR)"),
            optionalComponents = listOf("Potentiometer", "Breadboard"),
            steps = listOf(
                ProjectStep(1, "Build LDR voltage divider", "LDR between 5V and A0. 10kΩ resistor between A0 and GND. This creates a voltage that drops as light decreases."),
                ProjectStep(2, "Wire LED", "LED → 220Ω → pin 9."),
                ProjectStep(3, "Read and threshold", "int light = analogRead(A0); if (light < 400) { digitalWrite(9, HIGH); } else { digitalWrite(9, LOW); }"),
                ProjectStep(4, "Add hysteresis", "Use two thresholds (e.g. ON below 350, OFF above 450) to prevent flickering at the boundary."),
                ProjectStep(5, "Optional: PWM fade", "Use analogWrite with a mapped value for smooth dimming proportional to darkness level.")
            ),
            learningOutcomes = listOf("Voltage dividers", "LDR characteristics", "Threshold logic", "Hysteresis")
        ),

        Project(
            id = "ultrasonic_distance",
            name = "Ultrasonic Distance Meter",
            emoji = "📏",
            tagline = "Measure distance to objects in real time using sound waves",
            difficulty = Difficulty.INTERMEDIATE,
            estimatedTime = "45 min",
            requiredComponents = listOf("Arduino/Dev Board", "Ultrasonic Sensor"),
            optionalComponents = listOf("Display", "Buzzer/Speaker", "LED"),
            steps = listOf(
                ProjectStep(1, "Wire HC-SR04", "VCC → 5V, GND → GND, TRIG → pin 9, ECHO → pin 10."),
                ProjectStep(2, "Send pulse", "digitalWrite(TRIG, LOW); delayMicroseconds(2); digitalWrite(TRIG, HIGH); delayMicroseconds(10); digitalWrite(TRIG, LOW);"),
                ProjectStep(3, "Measure echo", "long duration = pulseIn(ECHO, HIGH); float distance = duration * 0.034 / 2; // in cm"),
                ProjectStep(4, "Display result", "Serial.print(distance); Serial.println(\" cm\"); — open Serial Monitor at 9600 baud."),
                ProjectStep(5, "Add alarm", "If distance < 10 cm, turn on LED or buzz the buzzer. Great parking sensor!")
            ),
            learningOutcomes = listOf("pulseIn() timing", "Sensor interfacing", "Real-world physics (speed of sound)")
        ),

        Project(
            id = "temperature_monitor",
            name = "Temperature Monitor",
            emoji = "🌡️",
            tagline = "Read room temperature and display it via Serial or LCD",
            difficulty = Difficulty.INTERMEDIATE,
            estimatedTime = "35 min",
            requiredComponents = listOf("Arduino/Dev Board", "Temperature Sensor"),
            optionalComponents = listOf("Display", "LED", "Buzzer/Speaker"),
            steps = listOf(
                ProjectStep(1, "Wire NTC thermistor", "Thermistor between 5V and A0. 10kΩ resistor between A0 and GND (voltage divider)."),
                ProjectStep(2, "Read resistance", "int raw = analogRead(A0); float R = 10000.0 * raw / (1023.0 - raw); // thermistor resistance in ohms"),
                ProjectStep(3, "Convert to °C (Steinhart-Hart)", "float T = 1.0 / (log(R/10000.0)/3950.0 + 1.0/298.15) - 273.15;"),
                ProjectStep(4, "Print to Serial", "Serial.print(T); Serial.println(\" C\"); with delay(1000) between readings."),
                ProjectStep(5, "Add alert LED", "If temperature > 30°C, light a red LED. If < 20°C, light a blue/white one.")
            ),
            learningOutcomes = listOf("NTC thermistors", "Steinhart-Hart equation", "Voltage dividers", "float arithmetic")
        ),

        Project(
            id = "ir_remote",
            name = "IR Remote Control",
            emoji = "📺",
            tagline = "Control LEDs or a motor using any TV remote control",
            difficulty = Difficulty.INTERMEDIATE,
            estimatedTime = "50 min",
            requiredComponents = listOf("Arduino/Dev Board", "IR Sensor", "LED"),
            optionalComponents = listOf("Resistor", "Motor", "Relay"),
            steps = listOf(
                ProjectStep(1, "Wire IR receiver", "VS1838B: VCC → 5V, GND → GND, OUT → pin 11."),
                ProjectStep(2, "Install IRremote library", "Arduino IDE → Sketch → Include Library → Manage Libraries → search 'IRremote' by Shirriff → Install."),
                ProjectStep(3, "Decode buttons", "Use the IRrecvDemo example to print hex codes for each button on your remote. Note which hex = which button."),
                ProjectStep(4, "Map to actions", "if (results.value == 0xFF6897) { // button '1' → toggle LED 1 }. Add cases for each button you want."),
                ProjectStep(5, "Control things", "Map different buttons to different LEDs, or send commands to a motor driver.")
            ),
            learningOutcomes = listOf("IR protocol decoding", "Library installation", "Switch-case logic", "External library APIs")
        ),

        Project(
            id = "bluetooth_led",
            name = "Bluetooth LED Controller",
            emoji = "📱",
            tagline = "Control LEDs from your phone over Bluetooth",
            difficulty = Difficulty.INTERMEDIATE,
            estimatedTime = "60 min",
            requiredComponents = listOf("Arduino/Dev Board", "Bluetooth Module", "LED", "Resistor"),
            steps = listOf(
                ProjectStep(1, "Wire HC-05", "VCC → 5V, GND → GND, TX → Arduino pin 0 (RX), RX → Arduino pin 1 (TX) via 1kΩ+2kΩ voltage divider."),
                ProjectStep(2, "Serial communication", "Serial.begin(9600); in setup(). In loop(): if (Serial.available()) { char c = Serial.read(); process(c); }"),
                ProjectStep(3, "Command protocol", "Send '1' = LED 1 ON, '2' = LED 1 OFF, '3' = LED 2 ON, etc. Parse with a simple if/else chain."),
                ProjectStep(4, "Phone app", "Install 'Serial Bluetooth Terminal' from Play Store. Pair with HC-05 (default PIN: 1234). Send commands."),
                ProjectStep(5, "Expand", "Add more commands for different components — buzzer, servo position, RGB LED colour codes.")
            ),
            learningOutcomes = listOf("UART serial protocol", "Bluetooth pairing", "Wireless control", "Communication protocols")
        ),

        Project(
            id = "motor_driver",
            name = "DC Motor Speed Controller",
            emoji = "⚙️",
            tagline = "Control a motor's speed and direction with PWM",
            difficulty = Difficulty.INTERMEDIATE,
            estimatedTime = "45 min",
            requiredComponents = listOf("Arduino/Dev Board", "Motor", "Transistor"),
            optionalComponents = listOf("Potentiometer", "Battery", "Resistor"),
            steps = listOf(
                ProjectStep(1, "Transistor circuit", "NPN transistor: Base → 1kΩ resistor → pin 9. Collector → motor negative. Motor positive → +12V external. Emitter → GND. Add flyback diode across motor."),
                ProjectStep(2, "PWM speed control", "analogWrite(9, 0–255) controls motor speed. 0 = stopped, 255 = full speed."),
                ProjectStep(3, "Add potentiometer", "Read A0, map to 0–255, write to motor PWM pin for knob-based speed control."),
                ProjectStep(4, "Direction control", "Use an L298N or L293D H-bridge module for full forward/reverse. Two pins: IN1 and IN2 set direction."),
                ProjectStep(5, "Safety", "Always use external power for the motor, never Arduino's 5V pin alone — motors draw too much current.")
            ),
            learningOutcomes = listOf("PWM motor control", "Transistor as switch", "H-bridge concept", "Power management")
        ),

        // ── ADVANCED ───────────────────────────────────────────────────────────

        Project(
            id = "servo_arm",
            name = "Servo Robotic Arm Joint",
            emoji = "🦾",
            tagline = "Control a servo motor angle precisely — the basis of robotics",
            difficulty = Difficulty.ADVANCED,
            estimatedTime = "90 min",
            requiredComponents = listOf("Arduino/Dev Board", "Motor", "Potentiometer"),
            steps = listOf(
                ProjectStep(1, "Wire servo", "Servo brown/black → GND, red → 5V, orange/white signal → pin 9. Use external 5V for multiple servos."),
                ProjectStep(2, "Include Servo library", "#include <Servo.h>. Servo myServo; myServo.attach(9); in setup()."),
                ProjectStep(3, "Position control", "myServo.write(90); // 0°–180° range. Use potentiometer mapped to 0–180 for manual control."),
                ProjectStep(4, "Sweep pattern", "for(int angle=0; angle<=180; angle++) { myServo.write(angle); delay(15); } then reverse."),
                ProjectStep(5, "Multi-servo arm", "Add 2–3 more servos on pins 10, 11. Control each with its own potentiometer to build a full arm joint.")
            ),
            learningOutcomes = listOf("Servo PWM protocol", "Servo library", "Mechanical linkage concepts", "Multi-actuator control")
        ),

        Project(
            id = "oled_display",
            name = "OLED Info Dashboard",
            emoji = "🖥️",
            tagline = "Drive an OLED screen to show sensor data in real time",
            difficulty = Difficulty.ADVANCED,
            estimatedTime = "75 min",
            requiredComponents = listOf("Arduino/Dev Board", "Display"),
            optionalComponents = listOf("Temperature Sensor", "Light Sensor (LDR)", "Ultrasonic Sensor"),
            steps = listOf(
                ProjectStep(1, "Wire I2C OLED", "SSD1306 OLED: VCC → 3.3V, GND → GND, SDA → A4, SCL → A5 (Arduino Uno I2C pins)."),
                ProjectStep(2, "Install libraries", "Library Manager: install 'Adafruit SSD1306' and 'Adafruit GFX Library'."),
                ProjectStep(3, "Init display", "#include <Adafruit_SSD1306.h>. Adafruit_SSD1306 display(128, 64, &Wire, -1); display.begin(SSD1306_SWITCHCAPVCC, 0x3C);"),
                ProjectStep(4, "Draw text", "display.clearDisplay(); display.setTextSize(2); display.setCursor(0,0); display.print(\"Temp: \"); display.println(temp); display.display();"),
                ProjectStep(5, "Build dashboard", "Add sensor readings, draw graphics with drawRect(), drawCircle(), create a scrolling data log.")
            ),
            learningOutcomes = listOf("I2C protocol", "SSD1306 driver", "GFX drawing API", "Display refresh patterns")
        ),

        Project(
            id = "relay_home_automation",
            name = "Relay Smart Switch",
            emoji = "🏠",
            tagline = "Control mains-voltage appliances safely via Arduino relay",
            difficulty = Difficulty.ADVANCED,
            estimatedTime = "60 min",
            requiredComponents = listOf("Arduino/Dev Board", "Relay"),
            optionalComponents = listOf("Bluetooth Module", "IR Sensor", "Push Button", "Light Sensor (LDR)"),
            steps = listOf(
                ProjectStep(1, "⚠️ Safety first", "NEVER touch relay mains terminals while powered. Use a relay module with optoisolation. Only connect mains wires when board is unpowered."),
                ProjectStep(2, "Wire relay module", "VCC → 5V, GND → GND, IN → pin 7. The relay module handles the coil drive transistor internally."),
                ProjectStep(3, "Control relay", "digitalWrite(7, LOW) = relay ON (most modules are active-low). HIGH = relay OFF."),
                ProjectStep(4, "Add trigger", "Use LDR for automatic light switching, or IR/Bluetooth for remote control."),
                ProjectStep(5, "Timer logic", "Use millis() for scheduled on/off — turn on at 18:00, off at 23:00 (combine with RTC module for real clock).")
            ),
            learningOutcomes = listOf("Relay operation", "Optoisolation safety", "Active-low logic", "Real-world automation")
        ),

        Project(
            id = "wifi_sensor",
            name = "WiFi IoT Sensor Node",
            emoji = "🌐",
            tagline = "Post sensor data to the web using ESP8266/ESP32 WiFi",
            difficulty = Difficulty.ADVANCED,
            estimatedTime = "120 min",
            requiredComponents = listOf("ESP WiFi Module"),
            optionalComponents = listOf("Temperature Sensor", "Light Sensor (LDR)", "Display"),
            steps = listOf(
                ProjectStep(1, "Set up ESP board", "Arduino IDE → Preferences → Board Manager URL: http://arduino.esp8266.com/stable/package_esp8266com_index.json. Install esp8266 board package."),
                ProjectStep(2, "Connect to WiFi", "#include <ESP8266WiFi.h>. WiFi.begin(\"SSID\", \"password\"); while(WiFi.status() != WL_CONNECTED) delay(500);"),
                ProjectStep(3, "Read sensor", "Wire temperature or LDR sensor to A0. Read value with analogRead(A0)."),
                ProjectStep(4, "HTTP POST to ThingSpeak", "Use WiFiClient and HTTPClient to POST readings to api.thingspeak.com (free IoT dashboard). Get free API key at thingspeak.com."),
                ProjectStep(5, "View dashboard", "ThingSpeak auto-plots your sensor data over time. Set up alerts via MATLAB Analysis when values exceed thresholds.")
            ),
            learningOutcomes = listOf("WiFi networking", "HTTP requests", "IoT platforms", "Cloud data logging")
        )
    )

    // ─── Matching Engine ────────────────────────────────────────────────────────

    /**
     * Returns projects that can be built with the detected components,
     * scored and sorted by how many required components are available.
     */
    fun matchProjects(detected: List<DetectedComponent>): List<Project> {
        val detectedNames = detected.map { it.name }.toSet()
        val detectedCategories = detected.map { it.category }.toSet()

        return ALL_PROJECTS.mapNotNull { project ->
            val required = project.requiredComponents
            val matched = required.count { req ->
                detectedNames.contains(req) ||
                detectedNames.any { it.contains(req.take(6), ignoreCase = true) } ||
                // Category-level fallback (e.g. any MICROCONTROLLER counts as Arduino)
                categoryFallback(req, detectedCategories)
            }

            val score = when {
                matched == required.size -> 100 + (project.optionalComponents.count { opt ->
                    detectedNames.contains(opt) || detectedNames.any { it.contains(opt.take(6), ignoreCase = true) }
                } * 10)
                matched >= required.size * 0.75 -> 60 + matched * 5
                matched >= required.size * 0.5 -> 30 + matched * 5
                else -> 0
            }

            if (score > 0) project.copy(matchScore = score) else null
        }
        .sortedWith(compareByDescending<Project> { it.matchScore }
            .thenBy { it.difficulty.ordinal })
        .take(6) // max 6 suggestions
    }

    private fun categoryFallback(required: String, categories: Set<ComponentCategory>): Boolean {
        return when {
            required.contains("Arduino") || required.contains("ESP") ->
                categories.contains(ComponentCategory.MICROCONTROLLER)
            required.contains("LED") ->
                categories.contains(ComponentCategory.ACTIVE)
            required.contains("Resistor") ->
                categories.contains(ComponentCategory.PASSIVE)
            required.contains("Sensor") ->
                categories.contains(ComponentCategory.SENSOR)
            required.contains("Motor") ->
                categories.contains(ComponentCategory.ACTIVE)
            else -> false
        }
    }

    fun getDemoProjects(): List<Project> {
        // Returns a sample for the demo/fallback state
        return ALL_PROJECTS
            .sortedBy { it.difficulty.ordinal }
            .take(4)
    }
}
