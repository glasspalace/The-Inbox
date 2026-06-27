package com.electroscan

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.electroscan.databinding.ActivityProjectDetailBinding

class ProjectDetailActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_PROJECT = "project"
    }

    private lateinit var binding: ActivityProjectDetailBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProjectDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val project = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(EXTRA_PROJECT, ProjectParcel::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra<ProjectParcel>(EXTRA_PROJECT)
        }
            ?: run { finish(); return }

        setupHeader(project)
        setupSteps(project)
        setupLearning(project)

        binding.btnBack.setOnClickListener { finish() }
    }

    private fun setupHeader(p: ProjectParcel) {
        binding.tvEmoji.text = p.emoji
        binding.tvProjectTitle.text = p.name
        binding.tvTagline.text = p.tagline
        binding.tvDifficultyBadge.text = p.difficultyLabel
        binding.tvDifficultyBadge.setBackgroundColor(p.difficultyColor)
        binding.tvTimeBadge.text = "⏱ ${p.estimatedTime}"

        // Required components
        binding.tvRequiredComponents.text =
            p.requiredComponents.joinToString(" • ") { "🔧 $it" }
    }

    private fun setupSteps(p: ProjectParcel) {
        binding.rvSteps.layoutManager = LinearLayoutManager(this)
        binding.rvSteps.adapter = StepsAdapter(p.steps)
    }

    private fun setupLearning(p: ProjectParcel) {
        if (p.learningOutcomes.isEmpty()) {
            binding.learningGroup.visibility = View.GONE
            return
        }
        binding.tvLearningOutcomes.text =
            p.learningOutcomes.joinToString("\n") { "✅ $it" }
    }

    // ─── Steps Adapter ──────────────────────────────────────────────────────────

    private class StepsAdapter(private val steps: List<StepParcel>) :
        RecyclerView.Adapter<StepsAdapter.VH>() {

        inner class VH(v: View) : RecyclerView.ViewHolder(v) {
            val number: TextView = v.findViewById(R.id.tvStepNumber)
            val title: TextView = v.findViewById(R.id.tvStepTitle)
            val detail: TextView = v.findViewById(R.id.tvStepDetail)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
            VH(LayoutInflater.from(parent.context)
                .inflate(R.layout.item_step, parent, false))

        override fun getItemCount() = steps.size

        override fun onBindViewHolder(holder: VH, position: Int) {
            val s = steps[position]
            holder.number.text = s.number.toString()
            holder.title.text = s.title
            holder.detail.text = s.detail
        }
    }
}
