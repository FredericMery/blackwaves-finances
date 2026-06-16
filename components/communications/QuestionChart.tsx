"use client"

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js"
import { Bar, Pie } from "react-chartjs-2"

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
)

export default function QuestionChart({ question, answers }: any) {

  const counts: any = {}

  answers.forEach((a: any) => {
    const value = a.answer_json
    if (!counts[value]) counts[value] = 0
    counts[value]++
  })

  const labels = Object.keys(counts)
  const values = Object.values(counts)

  const data = {
    labels,
    datasets: [
      {
        label: "Réponses",
        data: values,
        backgroundColor: [
          "#8b5cf6",
          "#06b6d4",
          "#10b981",
          "#f59e0b",
          "#ef4444"
        ]
      }
    ]
  }

  if (question.type === "single_choice" || question.type === "multi_choice") {
    return <Pie data={data} />
  }

  return <Bar data={data} />
}