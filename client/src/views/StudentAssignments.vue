<template>
  <StudentLayout
    title="作业库"
    subtitle="按课程查看作业"
    :profile-name="profileName"
    :profile-account="profileAccount"
    brand-sub="作业管理中心"
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
            <span class="status-inline active">进行中 {{ course.open }}</span>
            <span class="sub-split">·</span>
            <span class="status-inline archived">已截止 {{ course.closed }}</span>
            <span class="sub-split">·</span>
            <span class="status-inline archived">已归档 {{ course.archived }}</span>
          </div>
        </div>
        <div v-if="!courseList.length" class="task-empty">
          {{ assignmentError || '暂无课程' }}
        </div>
      </div>
    </section>
  </StudentLayout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import StudentLayout from '../components/StudentLayout.vue'
import { listAllAssignments } from '../api/assignment'
import { useStudentProfile } from '../composables/useStudentProfile'

const { profileName, profileAccount, refreshProfile } = useStudentProfile()
const assignmentItems = ref([])
const assignmentError = ref('')
const router = useRouter()

const courseList = computed(() => {
  const map = new Map()
  assignmentItems.value.forEach((item) => {
    const courseId = item.courseId
    if (!courseId) return
    if (!map.has(courseId)) {
      map.set(courseId, {
        courseId,
        name: item.courseName ?? item.courseId,
        total: 0,
        open: 0,
        closed: 0,
        archived: 0,
      })
    }
    const course = map.get(courseId)
    course.total += 1
    if (item.status === 'OPEN') course.open += 1
    else if (item.status === 'CLOSED') course.closed += 1
    else if (item.status === 'ARCHIVED') course.archived += 1
  })
  return Array.from(map.values())
})

const goCourse = (courseId) => {
  if (!courseId) return
  router.push(`/student/assignments/course/${courseId}`)
}

onMounted(async () => {
  await refreshProfile()

  try {
    const response = await listAllAssignments()
    assignmentItems.value = response?.items ?? []
  } catch (err) {
    assignmentError.value = err instanceof Error ? err.message : '加载作业失败'
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
  color: rgba(26, 29, 51, 0.55);
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
