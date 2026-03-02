<template>
  <view class="page">
    <view class="card header">
      <view>
        <view class="title">成绩详情</view>
        <view class="desc">{{ detail.assignmentTitle || '作业' }}</view>
      </view>
      <button class="ghost header-action" @click="goBack">返回</button>
    </view>

    <view class="card section" v-if="loading">
      <view class="empty">加载中...</view>
    </view>

    <view class="card section" v-else>
      <view class="summary">
        <view>
          <view class="label">总分</view>
          <view class="value">{{ detail.totalScore == null ? '--' : detail.totalScore }}</view>
        </view>
        <view>
          <view class="label">作业满分</view>
          <view class="value">{{ detail.weightedScore == null ? '--' : detail.weightedScore }}</view>
        </view>
      </view>

      <view class="q-list">
        <view v-for="q in detail.questions || []" :key="`${q.questionIndex}-${q.questionId || ''}`" class="q-item">
          <view class="q-title">第{{ q.questionIndex }}题</view>
          <view class="q-score">{{ q.score == null ? '--' : q.score }} / {{ q.maxScore }}</view>
          <view class="q-reason" v-if="q.finalComment || q.reason">{{ q.finalComment || q.reason }}</view>
        </view>
      </view>
    </view>

    <StudentBottomNav active="mine" />
  </view>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { getMyScoreDetail } from '../../api/score'
import { requireStudent } from '../../utils/storage'
import StudentBottomNav from '../../components/StudentBottomNav.vue'

const assignmentId = ref('')
const loading = ref(false)
const detail = ref({ questions: [] })

onMounted(async () => {
  if (!requireStudent()) return
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  assignmentId.value = current?.options?.assignmentId || ''
  await fetchDetail()
})

async function fetchDetail() {
  loading.value = true
  try {
    detail.value = await getMyScoreDetail(assignmentId.value)
  } catch (err) {
    uni.showToast({ title: err.message || '详情加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
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
  font-size: 40rpx;
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
  font-size: 24rpx;
  height: 68rpx;
  padding: 0 22rpx;
}

.section {
  padding: 24rpx;
}

.summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.label {
  color: #7d89a2;
  font-size: 24rpx;
}

.value {
  margin-top: 4rpx;
  font-size: 42rpx;
  font-weight: 700;
  color: #1f4fa8;
}

.q-list {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.q-item {
  border-radius: 16rpx;
  border: 2rpx solid #e4e9f4;
  background: #f9fbff;
  padding: 16rpx;
}

.q-title {
  font-size: 28rpx;
  font-weight: 700;
}

.q-score {
  margin-top: 6rpx;
  font-size: 26rpx;
  color: #3d4e71;
}

.q-reason {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #69758f;
}

.empty {
  padding: 28rpx;
  text-align: center;
  color: #8390a7;
}
</style>
