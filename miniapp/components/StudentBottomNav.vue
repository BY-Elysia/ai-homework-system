<template>
  <view class="tabbar-wrap">
    <view class="tabbar-shell">
      <view class="tab-item" :class="{ active: active === 'assignments' }" @click="goAssignments">
        <view class="tab-icon">作</view>
        <text class="tab-label">作业</text>
      </view>

      <view class="tab-item" :class="{ active: active === 'mine' }" @click="goMine">
        <view class="tab-icon">我</view>
        <text class="tab-label">我的</text>
      </view>
    </view>

    <view class="ai-wrap" @click="goAssistant">
      <view class="ai-bubble" :class="{ active: active === 'ai' }">
        <text class="ai-text">AI</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { replacePage } from '../utils/navigation'

defineProps({
  active: {
    type: String,
    default: 'mine',
  },
})

function goAssignments() {
  replacePage('/pages/student/assignments')
}

function goMine() {
  replacePage('/pages/student/courses')
}

function goAssistant() {
  replacePage('/pages/student/assistant')
}
</script>

<style scoped>
.tabbar-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  height: calc(126rpx + env(safe-area-inset-bottom));
}

.tabbar-shell {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(14rpx + env(safe-area-inset-bottom));
  height: 96rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8rpx 30rpx rgba(27, 42, 78, 0.14);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 68rpx;
}

.tab-item {
  width: 180rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  color: #667084;
  font-size: 24rpx;
  font-weight: 600;
}

.tab-item.active {
  color: #1f4fa8;
}

.tab-icon {
  width: 34rpx;
  height: 34rpx;
  border-radius: 10rpx;
  border: 2rpx solid currentColor;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18rpx;
  font-weight: 700;
}

.tab-label {
  font-size: 24rpx;
}

.ai-wrap {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(52rpx + env(safe-area-inset-bottom));
  width: 128rpx;
  height: 128rpx;
  border-radius: 64rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8rpx 30rpx rgba(27, 42, 78, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-bubble {
  width: 108rpx;
  height: 108rpx;
  border-radius: 54rpx;
  background: linear-gradient(135deg, #ffb27d 0%, #ff6b6b 52%, #ff8a65 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  box-shadow: inset 0 2rpx 10rpx rgba(255, 255, 255, 0.35);
}

.ai-bubble.active {
  transform: scale(1.03);
}

.ai-text {
  font-size: 30rpx;
  letter-spacing: 1rpx;
}
</style>
