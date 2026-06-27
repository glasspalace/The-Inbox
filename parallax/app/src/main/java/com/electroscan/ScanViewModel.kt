package com.electroscan

import android.graphics.Bitmap
import android.util.Base64
import android.util.Log
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.gson.Gson
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream
import java.util.concurrent.TimeUnit

class ScanViewModel : ViewModel() {

    sealed class ScanState {
        object Idle : ScanState()
        object Scanning : ScanState()
        data class Results(
            val components: List<ComponentDetector.DetectedComponent>,
            val projects: List<ProjectMatcher.Project>
        ) : ScanState()
        data class Error(val message: String) : ScanState()
    }

    private val _state = MutableLiveData<ScanState>(ScanState.Idle)
    val state: LiveData<ScanState> = _state

    // ── ML Kit fallback labeler ──────────────────────────────────────────────
    private val labeler = ImageLabeling.getClient(
        ImageLabelerOptions.Builder()
            .setConfidenceThreshold(0.40f)
            .build()
    )

    // ── HTTP client for Claude Vision API ────────────────────────────────────
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()

    // ── API key storage (set once at startup via MainActivity) ───────────────
    var anthropicApiKey: String = ""

    // ─────────────────────────────────────────────────────────────────────────
    // analyzeImage — main entry point
    // ─────────────────────────────────────────────────────────────────────────
    fun analyzeImage(bitmap: Bitmap) {
        _state.value = ScanState.Scanning

        viewModelScope.launch {
            try {
                // Scale bitmap for analysis — 800px wide is plenty for Claude Vision
                val analysisWidth  = minOf(bitmap.width,  800)
                val analysisHeight = (bitmap.height.toFloat() * analysisWidth / bitmap.width).toInt()
                val scaledBitmap   = Bitmap.createScaledBitmap(bitmap, analysisWidth, analysisHeight, true)

                // ── Primary: Claude Vision API ────────────────────────────────
                val claudeComponents = if (anthropicApiKey.isNotBlank()) {
                    try {
                        callClaudeVisionApi(scaledBitmap)
                    } catch (e: Exception) {
                        Log.w("ElectroScan", "Claude Vision API failed, falling back to ML Kit: ${e.message}")
                        emptyList()
                    }
                } else {
                    emptyList()
                }

                // ── Secondary: ML Kit on-device labeler (always runs) ─────────
                val mlkitLabels = runMlKitLabeler(scaledBitmap)

                // ── Merge results — Claude takes priority ─────────────────────
                val merged = mergeResults(claudeComponents, mlkitLabels)

                val components = ComponentDetector.parseLabels(merged)
                val projects   = ProjectMatcher.matchProjects(components)

                if (components.isEmpty()) {
                    _state.value = ScanState.Error(
                        "No electronic components detected.\n\n" +
                        "Tips:\n" +
                        "• Lay components flat on a light-coloured surface\n" +
                        "• Ensure good lighting (use flash in dark rooms)\n" +
                        "• Move 15–30 cm away from the components\n" +
                        "• Make sure components fill most of the frame"
                    )
                } else {
                    _state.value = ScanState.Results(components, projects)
                }

            } catch (e: Exception) {
                _state.value = ScanState.Error("Analysis failed: ${e.localizedMessage}")
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CLAUDE VISION API
    //
    // Sends the image to Claude and asks it to identify electronic components.
    // Returns a list of (component-keyword, confidence) pairs directly
    // compatible with ComponentDetector.parseLabels().
    //
    // The prompt is carefully structured so Claude returns ONLY a JSON array
    // of objects with "component" and "confidence" fields — no prose, no
    // markdown, no extra text. This makes parsing reliable.
    // ─────────────────────────────────────────────────────────────────────────
    private suspend fun callClaudeVisionApi(bitmap: Bitmap): List<Pair<String, Float>> =
        withContext(Dispatchers.IO) {

        // Encode bitmap to JPEG base64
        val jpegBytes = ByteArrayOutputStream().also { out ->
            bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)
        }.toByteArray()
        val base64Image = Base64.encodeToString(jpegBytes, Base64.NO_WRAP)

        // ── Prompt ────────────────────────────────────────────────────────────
        // The image lookup table is embedded directly in the prompt as a
        // reference guide so Claude knows exactly what each component looks
        // like and can map what it sees to the right names.
        val systemPrompt = """
You are an expert electronics component identifier. Your ONLY job is to look at an image and identify which electronic components are visible.

## Component Visual Reference (Image Lookup Table)

Use this guide to recognise components:

**MICROCONTROLLERS / DEVELOPMENT BOARDS**
- Arduino Uno: rectangular green PCB ~7x5cm, USB-B port, DC barrel jack, rows of pin headers, prominent ATmega328P chip, "Arduino" logo. Keywords: arduino, circuit board, pcb
- Arduino Nano/Mini: small green PCB ~4x2cm, USB mini port, pin headers on both sides. Keywords: arduino, circuit board
- Raspberry Pi: green PCB with USB ports, HDMI, CSI camera connector, 40-pin GPIO header. Keywords: raspberry pi, single board computer
- ESP8266/ESP32/NodeMCU: small blue or black board, silver antenna, USB micro port, "NodeMCU" or "ESP" labels. Keywords: esp32, esp8266, nodemcu, wifi module

**PASSIVE COMPONENTS**
- Resistor: small cylindrical body (tan, yellow, blue or green) with coloured bands (black/brown/red/orange/yellow/green/blue/violet/grey/white/gold/silver). Usually 5–25mm long. Keywords: resistor
- Ceramic Capacitor: small beige/yellow flat disc or block shape, two wire legs, value printed (e.g. 104, 0.1µF). Keywords: capacitor, ceramic capacitor
- Electrolytic Capacitor: tall aluminium cylinder (silver, black, or blue) with a white stripe and a + marking, polarised. Keywords: capacitor, electrolytic capacitor
- Inductor/Coil: coiled wire on a toroidal (donut) ferrite core, or a small cylindrical component similar to a resistor. Keywords: inductor, coil
- Crystal Oscillator: small silver metal can, usually rectangular or cylindrical with two or four legs. Keywords: crystal oscillator, quartz crystal
- Potentiometer: blue or black rectangular box with a rotating dial/knob, three terminals. Keywords: potentiometer, variable resistor

**ACTIVE COMPONENTS**
- LED: small round lens (3mm or 5mm) in red, green, blue, yellow, white or clear. Two wire legs; longer leg is positive. Keywords: led, light emitting diode
- Transistor (BJT/MOSFET): small D-shape or TO-92 plastic body with 3 legs (flat side facing you). Black plastic, printed with "2N3904", "BC547", "TIP120" etc. Keywords: transistor, mosfet, bjt transistor
- IC Chip / DIP package: black rectangular body with two rows of metal legs (e.g. 8, 14, 16 or 28 pins), notch or dot at pin 1 end. May have "NE555", "LM741", "74HC", "ATmega" etc. printed on it. Keywords: integrated circuit, dip ic, dip package
- Relay: blue or black rectangular box with pins, often with a transparent window showing internal coil. Keywords: relay, electromagnetic relay
- Buzzer: small round black cylinder with a "+" sign, or a small speaker. Keywords: buzzer, piezo buzzer
- DC/Servo/Stepper Motor: cylindrical metal body with a shaft, or plastic box with a shaft. Keywords: dc motor, servo motor, stepper motor
- Push Button (Tactile Switch): small square black body (~6x6mm) with 4 short metal pins and a clickable top cap. Keywords: button, push button, tactile switch

**SENSORS**
- LDR (Light Sensor): looks like a resistor but with a zig-zag pattern visible through a clear dome. Keywords: photoresistor, ldr
- Temperature Sensor: TO-92 package (looks like a transistor) or small IC, often labelled "LM35", "DS18B20", "NTC". Keywords: thermistor, temperature sensor, ntc thermistor
- Ultrasonic Sensor (HC-SR04): blue rectangular board with two silver cylindrical transducers (looks like two eyes), 4 pins (VCC, Trig, Echo, GND). Keywords: ultrasonic sensor, hc-sr04
- IMU/Gyro (MPU-6050): small blue or purple board with a tiny square IC chip, 8 pin header. Keywords: mpu-6050, mpu6050, imu module, gyroscope module, accelerometer module
- IR Sensor: small black dome on a PCB, or a separate black module with LED and detector. Keywords: ir sensor, infrared sensor

**DISPLAY**
- LCD 16x2: rectangular green or blue display module with two rows of 16 character cells, 16-pin header. Keywords: lcd display
- OLED Display: tiny black module (usually 0.96" or 1.3") with a bright screen and 4-pin I2C header. Keywords: oled display
- 7-Segment Display: rectangular component with 7 LED segments per digit, multiple pins. Keywords: seven segment display, 7 segment display

**CONNECTIVITY**
- Bluetooth Module (HC-05/HC-06): small blue or green rectangular PCB with "HC-05" or "HC-06" label, 6-pin header. Keywords: bluetooth module, hc-05, hc-06

**TOOLS / PROTOTYPING**
- Breadboard: rectangular white or beige board with a grid of small holes, red and blue rails along the sides. Keywords: breadboard, solderless breadboard
- Jumper Wires: colourful flexible wires with plastic connectors (male or female pins) at each end. Often sold in bundles. Keywords: wire, jumper wire, dupont wire
- Pin Headers: straight or right-angle rows of metal pins in black plastic carrier. Keywords: pin header, female header, male header

**POWER**
- Battery (9V): rectangular black battery with two terminals (snap connector) on top. Keywords: battery, 9v battery
- AA/AAA Battery: cylindrical batteries in battery holder, usually with red and black wires. Keywords: battery, aa battery
- Power Supply Module: rectangular PCB with DC barrel jack or USB port and output terminals. Keywords: power supply, dc adapter

---

## YOUR TASK

Look at the image carefully. For EVERY electronic component you can see, output it in the JSON array below.

CRITICAL RULES:
1. Return ONLY a valid JSON array — no text before or after, no markdown fences, no explanations.
2. Use only the keywords listed above (e.g. "arduino", "resistor", "led", "capacitor") as the "component" field.
3. Confidence must be a number between 0.0 and 1.0.
4. If multiple instances of the same component are visible (e.g. 3 LEDs), include it ONCE with high confidence.
5. If you see nothing electronic, return an empty array: []
6. Do NOT guess. Only list what you can clearly see.

Output format (example):
[
  {"component": "arduino", "confidence": 0.97},
  {"component": "resistor", "confidence": 0.93},
  {"component": "led", "confidence": 0.88},
  {"component": "breadboard", "confidence": 0.95}
]
        """.trimIndent()

        // ── Build request body ────────────────────────────────────────────────
        val requestBody = mapOf(
            "model"      to "claude-sonnet-4-6",
            "max_tokens" to 512,
            "system"     to systemPrompt,
            "messages"   to listOf(
                mapOf(
                    "role"    to "user",
                    "content" to listOf(
                        mapOf(
                            "type"   to "image",
                            "source" to mapOf(
                                "type"       to "base64",
                                "media_type" to "image/jpeg",
                                "data"       to base64Image
                            )
                        ),
                        mapOf(
                            "type" to "text",
                            "text" to "Identify all electronic components visible in this image. Return only the JSON array."
                        )
                    )
                )
            )
        )

        val json    = gson.toJson(requestBody)
        val request = Request.Builder()
            .url("https://api.anthropic.com/v1/messages")
            .addHeader("x-api-key",         anthropicApiKey)
            .addHeader("anthropic-version", "2023-06-01")
            .addHeader("content-type",      "application/json")
            .post(json.toRequestBody("application/json".toMediaType()))
            .build()

        val responseBody = httpClient.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                val errBody = response.body?.string() ?: "empty"
                throw Exception("Claude API error ${response.code}: $errBody")
            }
            response.body?.string() ?: throw Exception("Empty response from Claude API")
        }

        // ── Parse the response ────────────────────────────────────────────────
        parseClaudeResponse(responseBody)
    }

    /**
     * Extracts the text content from Claude's API response envelope and
     * then parses the JSON array of {component, confidence} objects.
     */
    @Suppress("UNCHECKED_CAST")
    private fun parseClaudeResponse(rawJson: String): List<Pair<String, Float>> {
        return try {
            // Unwrap the Anthropic response envelope
            val envelope = gson.fromJson(rawJson, Map::class.java)
            val content  = (envelope["content"] as? List<*>) ?: return emptyList()
            val firstBlock = content.firstOrNull() as? Map<*, *> ?: return emptyList()
            val text = firstBlock["text"] as? String ?: return emptyList()

            // The text should be a JSON array; strip any stray whitespace / fences
            val cleaned = text.trim()
                .removePrefix("```json").removePrefix("```")
                .removeSuffix("```").trim()

            // Parse array of {component, confidence}
            val array = gson.fromJson(cleaned, List::class.java) as? List<Map<*, *>>
                ?: return emptyList()

            array.mapNotNull { item ->
                val component  = item["component"]  as? String  ?: return@mapNotNull null
                val confidence = when (val c = item["confidence"]) {
                    is Double -> c.toFloat()
                    is Float  -> c
                    is Int    -> c.toFloat()
                    else      -> return@mapNotNull null
                }
                component.lowercase().trim() to confidence
            }
        } catch (e: Exception) {
            Log.e("ElectroScan", "Failed to parse Claude response: ${e.message}\nRaw: $rawJson")
            emptyList()
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ML Kit fallback — runs on-device, no internet required
    // ─────────────────────────────────────────────────────────────────────────
    private suspend fun runMlKitLabeler(bitmap: Bitmap): List<Pair<String, Float>> {
        return try {
            val image   = InputImage.fromBitmap(bitmap, 0)
            val results = labeler.process(image).await()
            results.map { it.text.lowercase() to it.confidence }
        } catch (e: Exception) {
            Log.w("ElectroScan", "ML Kit labeler failed: ${e.message}")
            emptyList()
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Merge Claude results with ML Kit results.
    //
    // Claude results have priority. ML Kit results are included only if they
    // don't duplicate a Claude result AND aren't vague generic terms that
    // cause false positives with the generic model.
    // ─────────────────────────────────────────────────────────────────────────
    private fun mergeResults(
        claudeHits: List<Pair<String, Float>>,
        mlkitHits:  List<Pair<String, Float>>
    ): List<Pair<String, Float>> {

        // Keywords already covered by Claude (at any confidence)
        val claudeKeywords = claudeHits.map { it.first.lowercase() }.toSet()

        // Generic/vague ML Kit labels that cause false positives
        val blockedMlKitTerms = setOf(
            "technology", "electronic device", "gadget", "machine", "hardware",
            "gyroscope", "accelerometer", "imu", "sensor", "detector",
            "electronic component", "electronics", "circuit", "electrical",
            "product", "device", "object", "item", "thing", "instrument",
            "component", "part", "board", "module"
        )

        val filteredMlKit = mlkitHits.filter { (label, _) ->
            val l = label.lowercase()
            val alreadyCovered  = claudeKeywords.any { ck -> l.contains(ck) || ck.contains(l) }
            val isBlocked       = blockedMlKitTerms.any { l.contains(it) }
            !alreadyCovered && !isBlocked
        }

        return claudeHits + filteredMlKit
    }

    fun reset() {
        _state.value = ScanState.Idle
    }

    override fun onCleared() {
        super.onCleared()
        labeler.close()
        httpClient.dispatcher.executorService.shutdown()
    }
}
