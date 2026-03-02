<template>
  <view class="page">
    <view class="card header">
      <view>
        <view class="title">作业库</view>
        <view class="desc">{{ isCourseMode ? `课程：${courseName}` : '按课程查看作业' }}</view>
      </view>
      <button v-if="isCourseMode" class="ghost header-action" @click="goBack">返回</button>
    </view>

    <view class="card section" v-if="!isCourseMode">
      <view class="section-title">课程列表</view>
      <view v-if="loading" class="empty">加载中...</view>
      <view v-else-if="!courseCards.length" class="empty">暂无作业</view>
      <view v-else class="list">
        <view v-for="course in courseCards" :key="course.id" class="course-item">
          <view>
            <view class="name">{{ course.name }}</view>
            <view class="meta">作业 {{ course.total }} 份 · 开放中 {{ course.open }} 份</view>
          </view>
          <button class="btn" @click="openCourse(course)">进入作业</button>
        </view>
      </view>
    </view>

    <view class="card section" v-else>
      <view class="section-title">课程作业</view>
      <view v-if="loading" class="empty">加载中...</view>
      <view v-else-if="!assignments.length" class="empty">暂无作业</view>
      <view v-else class="list">
        <view v-for="item in assignments" :key="item.id || item.assignmentId" class="assignment-item">
          <view class="left">
            <view class="name">{{ item.title }}</view>
            <view class="meta">状态：{{ statusLabel(item) }}</view>
            <view class="deadline">截止 {{ formatDateTime(item.deadline) }}</view>
          </view>
          <button
            class="btn"
            :class="{ disabled: isDisabled(item) }"
            :disabled="isDisabled(item)"
            @click="openAssignment(item)"
          >
            {{ actionLabel(item) }}
          </button>
        </view>
      </view>
    </view>

    <StudentBottomNav active="assignments" />
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { listAllAssignments } from '../../api/assignment'
import { formatDateTime } from '../../utils/time'
import { requireStudent } from '../../utils/storage'
import StudentBottomNav from '../../components/StudentBottomNav.vue'

const loading = ref(false)
const assignments = ref([])
const allAssignments = ref([])
const courseId = ref('')
const courseName = ref('')

const isCourseMode = computed(() => Boolean(courseId.value))

const courseCards = computed(() => {
  const map = new Map()
  ;(allAssignments.value || []).forEach((item) => {
    const id = item.courseId
    if (!id) return
    if (!map.has(id)) {
      map.set(id, {
        id,
        name: item.courseName || id,
        total: 0,
        open: 0,
      })
    }
    const row = map.get(id)
    row.total += 1
    if (item.status === 'OPEN') row.open += 1
  })
  return Array.from(map.values())
})

onMounted(async () => {
  if (!requireStudent()) return
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  courseId.value = current?.options?.courseId || ''
  courseName.value = decodeURIComponent(current?.options?.courseName || '')
  await fetchAssignments()
})

async function fetchAssignments() {
  loading.value = true
  try {
    const items = await listAllAssignments()
    allAssignments.value = items || []
    assignments.value = (items || [])
      .filter((it) => !courseId.value || it.courseId === courseId.value)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  } catch (err) {
    uni.showToast({ title: err.message || '作业加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function openCourse(course) {
  uni.navigateTo({
    url: `/pages/student/assignments?courseId=${course.id}&courseName=${encodeURIComponent(course.name)}`,
  })
}

function actionLabel(item) {
  return item.submitted ? '查看/修改作业' : '去提交作业'
}

function statusLabel(item) {
  if (item.status === 'HIDDEN') return '教师设置暂不可见'
  if (item.submitted) return '已提交'
  if (item.status === 'OPEN') return '待提交'
  if (item.status === 'CLOSED') return '已截止'
  return '已归档'
}

function isDisabled(item) {
  return item.status === 'HIDDEN'
}

function openAssignment(item) {
  const id = item.id || item.assignmentId
  uni.navigateTo({
    url: `/pages/student/submit?assignmentId=${id}&courseName=${encodeURIComponent(courseName.value || item.courseName || '')}`,
  })
}

function goBack() {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  padding-bottom: 170rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.card {
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 12rpx 24rpx rgba(44, 57, 87, 0.1);
}

.header {
  padding: 28rpx;
  display: flex;
  align-items: center;
}

.header-action {
  margin-left: auto;
}

.title {
  font-size: 42rpx;
  font-weight: 700;
}

.desc {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #79849a;
}

.ghost {
  border-radius: 16rpx;
  border: 2rpx solid #d3dbec;
  background: #fff;
  color: #47536d;
  font-size: 26rpx;
  height: 72rpx;
  padding: 0 24rpx;
}

.section {
  padding: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  margin-bottom: 12rpx;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.course-item,
.assignment-item {
  border-radius: 18rpx;
  background: #f9fbff;
  border: 2rpx solid #e3e9f5;
  padding: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
}

.left {
  flex: 1;
}

.name {
  font-size: 32rpx;
  font-weight: 700;
}

.meta {
  margin-top: 6rpx;
  color: #70809b;
  font-size: 24rpx;
}

.deadline {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8d5f36;
}

.btn {
  height: 64rpx;
  border: 0;
  border-radius: 14rpx;
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
  background: linear-gradient(90deg, #5a8ff2 0%, #69d0dc 100%);
  box-shadow: 0 8rpx 16rpx rgba(82, 147, 238, 0.22);
  padding: 0 18rpx;
}

.btn.disabled {
  background: #b7c4de;
  color: #eef3ff;
}

.empty {
  padding: 26rpx;
  text-align: center;
  color: #8390a7;
}
</style>
