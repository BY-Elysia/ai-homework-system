<template>
  <view class="page">
    <view class="header card">
      <view>
        <view class="title">我的课程</view>
        <view class="desc">选择课程进入作业与成绩</view>
      </view>
      <button class="ghost" @click="logout">退出</button>
    </view>

    <view class="card section">
      <view class="section-title">课程列表</view>
      <view v-if="loading" class="empty">加载中...</view>
      <view v-else-if="!courses.length" class="empty">暂无课程</view>
      <view v-else class="list">
        <view v-for="item in courses" :key="item.id" class="course-item">
          <view>
            <view class="course-name">{{ item.name }}</view>
            <view class="course-meta">作业 {{ item.assignmentCount }} 份 · 已出分 {{ item.gradedCount }} 份</view>
          </view>
          <view class="actions">
            <button class="btn" @click="goAssignments(item)">进入作业</button>
            <button class="btn btn-light" @click="goScores(item)">查看成绩</button>
          </view>
        </view>
      </view>
    </view>

    <StudentBottomNav active="mine" />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { listAllAssignments } from '../../api/assignment'
import { listMyScores } from '../../api/score'
import { clearAuth, requireStudent } from '../../utils/storage'
import StudentBottomNav from '../../components/StudentBottomNav.vue'
import { replacePage } from '../../utils/navigation'

const loading = ref(false)
const courses = ref([])

onMounted(async () => {
  if (!requireStudent()) return
  await fetchCourses()
})

async function fetchCourses() {
  loading.value = true
  try {
    const [assignmentItems, scoreItems] = await Promise.all([
      listAllAssignments(),
      listMyScores(),
    ])
    const map = new Map()

    ;(assignmentItems || []).forEach((item) => {
      const courseId = item.courseId
      if (!courseId) return
      if (!map.has(courseId)) {
        map.set(courseId, {
          id: courseId,
          name: item.courseName || courseId,
          assignmentCount: 0,
          gradedCount: 0,
        })
      }
      map.get(courseId).assignmentCount += 1
    })

    ;(scoreItems || []).forEach((item) => {
      const courseId = item.courseId
      if (!courseId) return
      if (!map.has(courseId)) {
        map.set(courseId, {
          id: courseId,
          name: item.courseName || courseId,
          assignmentCount: 0,
          gradedCount: 0,
        })
      }
      if (item.status === 'GRADED') {
        map.get(courseId).gradedCount += 1
      }
    })

    courses.value = Array.from(map.values())
  } catch (err) {
    uni.showToast({ title: err.message || '课程加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goAssignments(course) {
  uni.navigateTo({
    url: `/pages/student/assignments?courseId=${course.id}&courseName=${encodeURIComponent(course.name)}`,
  })
}

function goScores(course) {
  uni.navigateTo({
    url: `/pages/student/scores?courseId=${course.id}&courseName=${encodeURIComponent(course.name)}`,
  })
}

function logout() {
  clearAuth()
  replacePage('/pages/login/index')
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
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 42rpx;
  font-weight: 700;
  color: #1f2742;
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
  padding: 0 24rpx;
  height: 72rpx;
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

.course-item {
  border-radius: 18rpx;
  background: #f9fbff;
  border: 2rpx solid #e3e9f5;
  padding: 22rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.course-name {
  font-size: 32rpx;
  font-weight: 700;
}

.course-meta {
  margin-top: 6rpx;
  color: #7a869f;
  font-size: 24rpx;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
}

.btn {
  height: 68rpx;
  border: 0;
  border-radius: 14rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(90deg, #5a8ff2 0%, #69d0dc 100%);
  box-shadow: 0 8rpx 16rpx rgba(82, 147, 238, 0.22);
  padding: 0 22rpx;
}

.btn-light {
  color: #fff;
  background: linear-gradient(90deg, #7285f6 0%, #67b7f3 100%);
  box-shadow: 0 8rpx 16rpx rgba(103, 144, 243, 0.22);
}

.empty {
  padding: 26rpx;
  text-align: center;
  color: #8390a7;
}
</style>
