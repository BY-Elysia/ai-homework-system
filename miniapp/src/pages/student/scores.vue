<template>
  <view class="page">
    <view class="card header">
      <view>
        <view class="title">成绩看板</view>
        <view class="desc">{{ isCourseMode ? `课程：${courseName}` : '按课程查看成绩' }}</view>
      </view>
      <button v-if="isCourseMode" class="ghost header-action" @click="goBack">返回</button>
    </view>

    <view class="card section" v-if="!isCourseMode">
      <view class="section-title">课程列表</view>
      <view v-if="loading" class="empty">加载中...</view>
      <view v-else-if="!courseCards.length" class="empty">暂无成绩</view>
      <view v-else class="list">
        <view v-for="course in courseCards" :key="course.id" class="score-item">
          <view class="left">
            <view class="name">{{ course.name }}</view>
            <view class="meta">作业 {{ course.total }} 份 · 可见成绩 {{ course.viewable }} 份</view>
          </view>
          <button class="btn" @click="openCourse(course)">查看成绩</button>
        </view>
      </view>
    </view>

    <view class="card section" v-else>
      <view class="section-title">课程成绩</view>
      <view v-if="loading" class="empty">加载中...</view>
      <view v-else-if="!rows.length" class="empty">暂无成绩</view>
      <view v-else class="list">
        <view v-for="row in rows" :key="row.assignmentId" class="score-item">
          <view class="left">
            <view class="name">{{ row.assignmentTitle }}</view>
            <view class="meta">状态：{{ row.totalScore == null ? '不可见/待发布' : '已发布' }}</view>
          </view>
          <view class="right">
            <view class="value">{{ row.totalScore == null ? '--' : `${row.totalScore}` }}</view>
            <button
              class="btn"
              :class="{ disabled: row.totalScore == null }"
              :disabled="row.totalScore == null"
              @click="goDetail(row.assignmentId)"
            >
              查看详情
            </button>
          </view>
        </view>
      </view>
    </view>

    <StudentBottomNav active="mine" />
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { listMyScores } from '../../api/score'
import { listAllAssignments } from '../../api/assignment'
import { requireStudent } from '../../utils/storage'
import StudentBottomNav from '../../components/StudentBottomNav.vue'

const loading = ref(false)
const rows = ref([])
const scoreItems = ref([])
const assignmentItems = ref([])
const courseId = ref('')
const courseName = ref('')

const isCourseMode = computed(() => Boolean(courseId.value))

const courseCards = computed(() => {
  const map = new Map()
  ;(assignmentItems.value || []).forEach((item) => {
    const id = item.courseId
    if (!id) return
    if (!map.has(id)) {
      map.set(id, {
        id,
        name: item.courseName || id,
        total: 0,
        viewable: 0,
      })
    }
    const row = map.get(id)
    row.total += 1
    if (item.allowViewScore !== false) {
      row.viewable += 1
    }
  })

  ;(scoreItems.value || []).forEach((item) => {
    const id = item.courseId
    if (!id) return
    if (!map.has(id)) {
      map.set(id, {
        id,
        name: item.courseName || id,
        total: 0,
        viewable: 0,
      })
    }
    const row = map.get(id)
    if (row.total === 0) row.total += 1
    if (item.status === 'GRADED') row.viewable += 1
  })

  return Array.from(map.values())
})

onMounted(async () => {
  if (!requireStudent()) return
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  courseId.value = current?.options?.courseId || ''
  courseName.value = decodeURIComponent(current?.options?.courseName || '')
  await fetchScores()
})

async function fetchScores() {
  loading.value = true
  try {
    const [scoreRows, assignmentRows] = await Promise.all([
      listMyScores(),
      listAllAssignments(),
    ])
    scoreItems.value = scoreRows || []
    assignmentItems.value = assignmentRows || []

    rows.value = (scoreRows || []).filter((it) => !courseId.value || it.courseId === courseId.value)
  } catch (err) {
    uni.showToast({ title: err.message || '成绩加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function openCourse(course) {
  uni.navigateTo({
    url: `/pages/student/scores?courseId=${course.id}&courseName=${encodeURIComponent(course.name)}`,
  })
}

function goDetail(assignmentId) {
  uni.navigateTo({ url: `/pages/student/score-detail?assignmentId=${assignmentId}` })
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
  color: #79849a;
  font-size: 24rpx;
}

.ghost {
  border-radius: 16rpx;
  border: 2rpx solid #d3dbec;
  background: #fff;
  color: #47536d;
  font-size: 26rpx;
  height: 72rpx;
  padding: 0 22rpx;
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

.score-item {
  border-radius: 18rpx;
  background: #f8faff;
  border: 2rpx solid #e4e9f4;
  padding: 20rpx;
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
}

.left {
  flex: 1;
}

.name {
  font-size: 30rpx;
  font-weight: 700;
}

.meta {
  margin-top: 8rpx;
  color: #7f8aa2;
  font-size: 24rpx;
}

.right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10rpx;
}

.value {
  font-size: 36rpx;
  font-weight: 700;
  color: #244a95;
}

.btn {
  height: 64rpx;
  border-radius: 14rpx;
  border: 0;
  padding: 0 18rpx;
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
  background: linear-gradient(90deg, #5a8ff2 0%, #69d0dc 100%);
  box-shadow: 0 8rpx 16rpx rgba(82, 147, 238, 0.22);
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
