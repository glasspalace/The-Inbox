package com.electroscan

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.electroscan.databinding.ActivityResultsBinding
import com.google.android.material.chip.Chip

class ResultsActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_COMPONENTS = "components"
        const val EXTRA_COMPONENT_ICONS = "component_icons"
        const val EXTRA_COMPONENT_CONF = "component_conf"
        const val EXTRA_PROJECTS = "projects"
    }

    private lateinit var binding: ActivityResultsBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityResultsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val components  = intent.getStringArrayListExtra(EXTRA_COMPONENTS)  ?: arrayListOf()
        val icons       = intent.getStringArrayListExtra(EXTRA_COMPONENT_ICONS) ?: arrayListOf()
        val confidences = intent.getFloatArrayExtra(EXTRA_COMPONENT_CONF)   ?: FloatArray(0)
        val projects = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableArrayListExtra(EXTRA_PROJECTS, ProjectParcel::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableArrayListExtra<ProjectParcel>(EXTRA_PROJECTS)
        } ?: arrayListOf()

        setupComponentsPage(components, icons, confidences)
        setupProjectsPage(projects)

        // Start on page 1 (components)
        showPage(0)

        // Header back button — on page 1 exits, on page 2 goes back to page 1
        binding.btnBack.setOnClickListener {
            if (binding.viewFlipper.displayedChild == 1) showPage(0) else finish()
        }

        binding.btnNext.setOnClickListener { showPage(1) }
        binding.btnBackToComponents.setOnClickListener { showPage(0) }
    }

    private fun showPage(index: Int) {
        binding.viewFlipper.displayedChild = index
        if (index == 0) {
            binding.tvScreenTitle.text = "Components Found"
            binding.tvStep.text = "1 / 2"
        } else {
            binding.tvScreenTitle.text = "What You Can Build"
            binding.tvStep.text = "2 / 2"
        }
    }

    // ── Page 1: components ─────────────────────────────────────────────────────

    private fun setupComponentsPage(names: List<String>, icons: List<String>, conf: FloatArray) {
        binding.tvComponentCount.text =
            "${names.size} component${if (names.size != 1) "s" else ""} detected"

        binding.chipGroup.removeAllViews()
        if (names.isEmpty()) {
            binding.tvNoComponents.visibility = View.VISIBLE
        } else {
            names.forEachIndexed { i, name ->
                val chip = Chip(this).apply {
                    val icon = icons.getOrElse(i) { "🔧" }
                    val pct  = ((conf.getOrElse(i) { 0f }) * 100).toInt()
                    text = "$icon $name"
                    isCheckable = false
                    setChipBackgroundColorResource(R.color.chip_background)
                    setTextColor(getColor(R.color.chip_text))
                    chipStrokeWidth = 2f
                    setChipStrokeColorResource(R.color.chip_stroke)
                    tooltipText = "$pct% confidence"
                }
                binding.chipGroup.addView(chip)
            }
        }
    }

    // ── Page 2: projects ───────────────────────────────────────────────────────

    private fun setupProjectsPage(projects: List<ProjectParcel>) {
        binding.tvProjectCount.text =
            "${projects.size} project${if (projects.size != 1) "s" else ""} you can build"

        if (projects.isEmpty()) {
            binding.rvProjects.visibility = View.GONE
            binding.tvNoProjects.visibility = View.VISIBLE
        } else {
            binding.rvProjects.layoutManager = LinearLayoutManager(this)
            binding.rvProjects.adapter = ProjectAdapter(projects) { project ->
                val intent = Intent(this, ProjectDetailActivity::class.java).apply {
                    putExtra(ProjectDetailActivity.EXTRA_PROJECT, project)
                }
                startActivity(intent)
            }
        }
    }

    // ── Project card adapter ───────────────────────────────────────────────────

    private class ProjectAdapter(
        private val projects: List<ProjectParcel>,
        private val onClick: (ProjectParcel) -> Unit
    ) : RecyclerView.Adapter<ProjectAdapter.VH>() {

        inner class VH(v: View) : RecyclerView.ViewHolder(v) {
            val emoji:      TextView = v.findViewById(R.id.tvEmoji)
            val name:       TextView = v.findViewById(R.id.tvProjectName)
            val tagline:    TextView = v.findViewById(R.id.tvTagline)
            val difficulty: TextView = v.findViewById(R.id.tvDifficulty)
            val time:       TextView = v.findViewById(R.id.tvTime)
            val components: TextView = v.findViewById(R.id.tvComponents)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
            VH(LayoutInflater.from(parent.context)
                .inflate(R.layout.item_project_card, parent, false))

        override fun getItemCount() = projects.size

        override fun onBindViewHolder(holder: VH, position: Int) {
            val p = projects[position]
            holder.emoji.text = p.emoji
            holder.name.text = p.name
            holder.tagline.text = p.tagline
            holder.difficulty.text = p.difficultyLabel
            holder.difficulty.setBackgroundColor(p.difficultyColor)
            holder.time.text = "⏱ ${p.estimatedTime}"
            holder.components.text = "🔧 ${p.requiredComponents.joinToString(", ")}"
            holder.itemView.setOnClickListener { onClick(p) }
        }
    }
}
