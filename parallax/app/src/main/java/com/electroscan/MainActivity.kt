package com.electroscan

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Bundle
import android.view.View
import android.widget.EditText
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import com.electroscan.databinding.ActivityMainBinding
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val viewModel: ScanViewModel by viewModels()
    private lateinit var cameraExecutor: ExecutorService
    private var imageCapture: ImageCapture? = null
    private var camera: Camera? = null

    companion object {
        private const val PREFS_NAME   = "ElectroScanPrefs"
        private const val PREFS_API_KEY = "anthropic_api_key"
    }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) startCamera()
        else Toast.makeText(this, "Camera permission required", Toast.LENGTH_LONG).show()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        cameraExecutor = Executors.newSingleThreadExecutor()

        // Load and apply stored API key on startup
        loadApiKey()

        setupUI()
        observeViewModel()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        } else {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }

        // Prompt for API key on first launch (only if not yet set)
        if (viewModel.anthropicApiKey.isBlank()) {
            showApiKeyDialog(firstTime = true)
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // API key management
    // ─────────────────────────────────────────────────────────────────────────

    private fun loadApiKey() {
        val prefs  = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val stored = prefs.getString(PREFS_API_KEY, "") ?: ""
        viewModel.anthropicApiKey = stored
    }

    private fun saveApiKey(key: String) {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(PREFS_API_KEY, key.trim())
            .apply()
        viewModel.anthropicApiKey = key.trim()
    }

    private fun showApiKeyDialog(firstTime: Boolean = false) {
        val input = EditText(this).apply {
            hint  = "sk-ant-api03-..."
            setText(viewModel.anthropicApiKey)
            setTextColor(0xFF1A1A1A.toInt())
            setHintTextColor(0xFF888888.toInt())
            setPadding(48, 32, 48, 32)
            inputType = android.text.InputType.TYPE_CLASS_TEXT or
                        android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
        }

        val title   = if (firstTime) "Set Anthropic API Key" else "Update API Key"
        val message = if (firstTime)
            "ElectroScan uses Claude Vision AI for accurate component detection.\n\n" +
            "Enter your Anthropic API key (starts with sk-ant-). " +
            "You can get one free at console.anthropic.com.\n\n" +
            "The app works without a key using on-device ML Kit, but accuracy will be lower."
        else
            "Enter your Anthropic API key to enable Claude Vision AI detection.\n" +
            "Get a key at console.anthropic.com"

        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setView(input)
            .setPositiveButton("Save") { _, _ ->
                val key = input.text.toString().trim()
                saveApiKey(key)
                if (key.isNotBlank()) {
                    Toast.makeText(this, "✓ API key saved — AI detection enabled", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "No key entered — using on-device detection only", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton(if (firstTime) "Skip" else "Cancel", null)
            .show()
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UI
    // ─────────────────────────────────────────────────────────────────────────

    private fun setupUI() {
        binding.btnScan.setOnClickListener {
            captureAndAnalyze()
        }

        binding.btnFlash.setOnClickListener {
            toggleFlash()
        }

        binding.btnHelp.setOnClickListener {
            showHelpMenu()
        }
    }

    private fun observeViewModel() {
        viewModel.state.observe(this) { state ->
            when (state) {
                is ScanViewModel.ScanState.Idle -> {
                    binding.scanOverlay.visibility = View.GONE
                    binding.btnScan.isEnabled = true
                    binding.btnScan.text = "SCAN"
                    binding.loadingGroup.visibility = View.GONE
                }

                is ScanViewModel.ScanState.Scanning -> {
                    binding.btnScan.isEnabled = false
                    binding.btnScan.text = "SCANNING..."
                    binding.loadingGroup.visibility = View.VISIBLE
                    binding.scanOverlay.visibility = View.VISIBLE
                    val mode = if (viewModel.anthropicApiKey.isNotBlank()) "AI" else "on-device"
                    binding.tvLoadingText.text = "Detecting components ($mode)..."
                    animateScanLine()
                }

                is ScanViewModel.ScanState.Results -> {
                    binding.loadingGroup.visibility = View.GONE
                    binding.scanOverlay.visibility = View.GONE
                    binding.btnScan.isEnabled = true
                    binding.btnScan.text = "SCAN AGAIN"

                    val intent = Intent(this, ResultsActivity::class.java).apply {
                        putExtra(ResultsActivity.EXTRA_COMPONENTS,
                            ArrayList(state.components.map { it.name }))
                        putExtra(ResultsActivity.EXTRA_COMPONENT_ICONS,
                            ArrayList(state.components.map { it.icon }))
                        putExtra(ResultsActivity.EXTRA_COMPONENT_CONF,
                            FloatArray(state.components.size) { i -> state.components[i].confidence })
                        putParcelableArrayListExtra(ResultsActivity.EXTRA_PROJECTS,
                            ArrayList(state.projects.map { ProjectParcel.from(it) }))
                    }
                    startActivity(intent)
                    viewModel.reset()
                }

                is ScanViewModel.ScanState.Error -> {
                    binding.loadingGroup.visibility = View.GONE
                    binding.scanOverlay.visibility = View.GONE
                    binding.btnScan.isEnabled = true
                    binding.btnScan.text = "TRY AGAIN"
                    Toast.makeText(this, state.message, Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder()
                .setTargetAspectRatio(AspectRatio.RATIO_16_9)
                .build()
                .also { it.setSurfaceProvider(binding.viewFinder.surfaceProvider) }

            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                .setTargetAspectRatio(AspectRatio.RATIO_16_9)
                .build()

            try {
                cameraProvider.unbindAll()
                camera = cameraProvider.bindToLifecycle(
                    this,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    imageCapture
                )
            } catch (e: Exception) {
                Toast.makeText(this, "Camera init failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun captureAndAnalyze() {
        val capture = imageCapture ?: return

        capture.takePicture(cameraExecutor, object : ImageCapture.OnImageCapturedCallback() {
            override fun onCaptureSuccess(imageProxy: ImageProxy) {
                val bitmap = try {
                    // Keep a reasonable resolution for Claude Vision — 1024px wide max
                    val maxW   = 1024
                    val srcBmp = imageProxy.toBitmap()
                    if (srcBmp.width > maxW) {
                        val h = (srcBmp.height.toFloat() * maxW / srcBmp.width).toInt()
                        Bitmap.createScaledBitmap(srcBmp, maxW, h, true)
                    } else {
                        srcBmp
                    }
                } catch (e: Exception) {
                    runOnUiThread {
                        Toast.makeText(this@MainActivity,
                            "Failed to process image: ${e.message}", Toast.LENGTH_SHORT).show()
                        viewModel.reset()
                    }
                    return
                } finally {
                    imageProxy.close()
                }

                runOnUiThread {
                    viewModel.analyzeImage(bitmap)
                }
            }

            override fun onError(exception: ImageCaptureException) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity,
                        "Capture failed: ${exception.message}", Toast.LENGTH_SHORT).show()
                    viewModel.reset()
                }
            }
        })
    }

    private fun toggleFlash() {
        camera?.cameraControl?.let { ctrl ->
            val isOn = camera?.cameraInfo?.torchState?.value == 1
            ctrl.enableTorch(!isOn)
            binding.btnFlash.text = if (isOn) "⚡" else "⚡ON"
        }
    }

    private fun animateScanLine() {
        binding.scanLine.visibility = View.VISIBLE
        val h = binding.scanOverlay.height.toFloat()
        binding.scanLine.animate()
            .translationY(h)
            .setDuration(2000)
            .withEndAction {
                binding.scanLine.translationY = 0f
                if (viewModel.state.value is ScanViewModel.ScanState.Scanning) {
                    animateScanLine()
                }
            }
            .start()
    }

    private fun showHelpMenu() {
        val options = arrayOf("📖 Scanning Tips", "🔑 Set/Update API Key")
        AlertDialog.Builder(this)
            .setTitle("Help")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> showTips()
                    1 -> showApiKeyDialog(firstTime = false)
                }
            }
            .show()
    }

    private fun showTips() {
        val mode = if (viewModel.anthropicApiKey.isNotBlank())
            "✅ Claude Vision AI (high accuracy)"
        else
            "⚠️ On-device ML Kit only (lower accuracy — set an API key for best results)"

        val tips = """
            Detection mode: $mode

            📸 Scanning Tips:
            
            • Lay components flat on a light, plain surface (white paper works great)
            • Ensure good lighting — use the flash ⚡ in dim conditions
            • Fill the frame: move 15–30 cm from the components
            • Keep the camera steady when tapping SCAN
            • For best results, point at one type of component at a time
            • Arduino boards: make sure the green PCB and labels are clearly visible
            • Resistors: hold close enough to see the colour bands
            • Small ICs: tap the flash on and get very close
        """.trimIndent()

        AlertDialog.Builder(this)
            .setTitle("How to Scan")
            .setMessage(tips)
            .setPositiveButton("Got it", null)
            .show()
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
    }
}
