package com.electroscan

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class ProjectParcel(
    val id: String,
    val name: String,
    val emoji: String,
    val tagline: String,
    val difficultyLabel: String,
    val difficultyColor: Int,
    val estimatedTime: String,
    val requiredComponents: ArrayList<String>,
    val steps: ArrayList<StepParcel>,
    val learningOutcomes: ArrayList<String>,
    val matchScore: Int
) : Parcelable {
    companion object {
        fun from(p: ProjectMatcher.Project) = ProjectParcel(
            id = p.id,
            name = p.name,
            emoji = p.emoji,
            tagline = p.tagline,
            difficultyLabel = p.difficulty.label,
            difficultyColor = p.difficulty.color,
            estimatedTime = p.estimatedTime,
            requiredComponents = ArrayList(p.requiredComponents),
            steps = ArrayList(p.steps.map { StepParcel(it.number, it.title, it.detail) }),
            learningOutcomes = ArrayList(p.learningOutcomes),
            matchScore = p.matchScore
        )
    }
}

@Parcelize
data class StepParcel(
    val number: Int,
    val title: String,
    val detail: String
) : Parcelable
