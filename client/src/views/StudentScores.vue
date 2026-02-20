<template>
  <StudentLayout
    title="成绩看板"
    subtitle="按课程查看成绩"
    :profile-name="profileName"
    :profile-account="profileAccount"
    brand-sub="成绩看板"
  >
    <section class="panel glass">
      <div class="panel-title">
        选择课程
        <span class="badge">{{ courseList.length }} 门</span>
      </div>
      <div class="course-grid">
        <div
          v-for="course in courseList"
          :key="course.courseId"
          class="course-card"
          @click="goCourse(course.courseId)"
        >
          <div class="course-title">{{ course.name }}</div>
          <div class="course-sub">
            <span>作业 {{ course.total }} 份</span>
            <span class="sub-split">·</span>
            <span class="status-inline active">可见 {{ course.viewable }} 份</span>
            <span class="sub-split">·</span>
            <span class="status-inline archived"
              >不可见 {{ Math.max(course.total - course.viewable, 0) }} 份</span
            >
          </div>
        </div>
        <div v-if="!courseList.length" class="task-empty">
          {{ scoreError || '暂无成绩' }}
        </div>
      </div>
    </section>
  </StudentLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import StudentLayout from '../components/StudentLayout.vue'
import { listMyScores, type ScoreSummary } from '../api/score'
import { listAllAssignments, type AssignmentSummary } from '../api/assignment'
import { useStudentProfile } from '../composables/useStudentProfile'

const { profileName, profileAccount, refreshProfile } = useStudentProfile()
const scoreItems = ref<ScoreSummary[]>([])
const assignmentItems = ref<AssignmentSummary[]>([])
const scoreError = ref('')
const router = useRouter()

const courseList = computed(() => {
  const map = new Map<string, { courseId: string; name: string; total: number; viewable: number }>()
  const assignmentCourses = new Set<string>()
  assignmentItems.value.forEach((item) => {
    const courseId = item.courseId
    if (!courseId) return
    assignmentCourses.add(courseId)
    if (!map.has(courseId)) {
      map.set(courseId, {
        courseId,
        name: item.courseName ?? courseId,
        total: 0,
        viewable: 0,
      })
    }
    const target = map.get(courseId)!
    target.total += 1
    if (item.allowViewScore !== false) {
      target.viewable += 1
    }
  })

  scoreItems.value.forEach((item) => {
    const courseId = item.courseId
    if (!courseId) return
    if (assignmentCourses.has(courseId)) return
    if (!map.has(courseId)) {
      map.set(courseId, {
        courseId,
        name: item.courseName ?? courseId,
        total: 0,
        viewable: 0,
      })
    }
    const target = map.get(courseId)!
    target.total += 1
    if (item.status === 'GRADED') {
      target.viewable += 1
    }
  })
  return Array.from(map.values())
})

const goCourse = (courseId: string) => {
  if (!courseId) return
  router.push(`/student/scores/course/${courseId}`)
}

onMounted(async () => {
  await refreshProfile()

  try {
    const [scoreResponse, assignmentResponse] = await Promise.all([
      listMyScores(),
      listAllAssignments(),
    ])
    scoreItems.value = scoreResponse?.items ?? []
    assignmentItems.value = assignmentResponse?.items ?? []
  } catch (err) {
    scoreError.value = err instanceof Error ? err.message : '加载成绩失败'
  }
})
</script>

<style scoped>
.course-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.course-card {
  padding: 16px 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: grid;
  gap: 6px;
}

.course-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(24, 34, 64, 0.12);
}

.course-title {
  font-weight: 700;
  font-size: 16px;
}

.course-sub {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(26, 29, 51, 0.6);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.sub-split {
  color: rgba(26, 29, 51, 0.4);
}

.status-inline {
  font-weight: 700;
}

.status-inline.active {
  color: #3b6fe1;
}

.status-inline.archived {
  color: rgba(26, 29, 51, 0.64);
}
</style>
