<template>
  <view class="page">
    <view class="welcome">
      <view class="welcome-hi">Hi，你好</view>
      <view class="welcome-title">欢迎进入作业管理系统</view>
      <view class="welcome-sub">Homework Management System</view>
    </view>

    <view class="card">
      <view class="title">登录</view>
      <view class="subtitle">使用现有账号登录系统</view>

      <picker
        class="picker"
        mode="selector"
        :range="schools"
        range-key="name"
        :value="schoolIndex"
        @change="onSchoolChange"
      >
        <view class="picker-value">{{ schools[schoolIndex]?.name || '请选择学校' }}</view>
      </picker>

      <input v-model="form.account" class="input" placeholder="请输入学号/工号" />
      <input v-model="form.password" class="input" placeholder="请输入密码" password />

      <button class="btn" :disabled="loading" @click="onLogin">
        {{ loading ? '登录中...' : '登录' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { login } from '../../api/auth'
import { getAccessToken, getUser } from '../../utils/storage'
import { replacePage } from '../../utils/navigation'

const loading = ref(false)
const schools = [
  {
    name: '重庆邮电大学',
    value: '重庆邮电大学',
    aliases: ['sch_1'],
  },
]
const schoolIndex = ref(0)

const form = reactive({
  account: '',
  password: '',
})

onMounted(() => {
  const token = getAccessToken()
  const user = getUser()
  if (token && user?.role === 'STUDENT') {
    replacePage('/pages/student/courses')
  }
})

function onSchoolChange(event) {
  const value = Number(event?.detail?.value ?? 0)
  schoolIndex.value = Number.isFinite(value) ? value : 0
}

async function onLogin() {
  const selectedSchool = schools[schoolIndex.value]
  const schoolCandidates = [
    selectedSchool?.value,
    selectedSchool?.name,
    ...(selectedSchool?.aliases || []),
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item, idx, arr) => arr.indexOf(item) === idx)

  if (!schoolCandidates.length || !form.account || !form.password) {
    uni.showToast({ title: '请完整填写登录信息', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const accountTypes = ['USERNAME', 'STUDENT_ID']
    let user = null
    let lastError = null

    for (const schoolId of schoolCandidates) {
      for (const accountType of accountTypes) {
        try {
          user = await login({
            schoolId,
            accountType,
            account: form.account.trim(),
            password: form.password,
          })
          break
        } catch (err) {
          const message = err?.message || ''
          lastError = err
          // Only continue on credential mismatch; for other errors, stop immediately.
          if (
            !String(message).includes('账号或密码错误') &&
            !String(message).includes('请求失败(401)')
          ) {
            throw err
          }
        }
      }
      if (user) break
    }

    if (!user) {
      throw lastError || new Error('账号或密码错误')
    }

    if (user.role !== 'STUDENT') {
      uni.showToast({ title: '当前版本仅开放学生功能', icon: 'none' })
      loading.value = false
      return
    }

    replacePage('/pages/student/courses')
  } catch (err) {
    uni.showToast({ title: err.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 44rpx 28rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 28rpx;
}

.welcome {
  padding: 0 10rpx;
}

.welcome-hi {
  font-size: 46rpx;
  font-weight: 700;
  color: #1d2942;
}

.welcome-title {
  margin-top: 10rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: #2e3b59;
}

.welcome-sub {
  margin-top: 8rpx;
  color: #7c879d;
  font-size: 24rpx;
}

.card {
  border-radius: 26rpx;
  padding: 36rpx;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 14rpx 30rpx rgba(38, 54, 90, 0.12);
}

.title {
  font-size: 44rpx;
  font-weight: 700;
  color: #1f2742;
}

.subtitle {
  margin-top: 8rpx;
  margin-bottom: 24rpx;
  color: #74809a;
  font-size: 26rpx;
}

.picker {
  width: 100%;
  height: 86rpx;
  border-radius: 16rpx;
  border: 2rpx solid #dbe3f2;
  background: #f7f9fd;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
}

.picker-value {
  width: 100%;
  padding: 0 24rpx;
  line-height: 86rpx;
  color: #303b56;
  font-size: 28rpx;
}

.input {
  width: 100%;
  height: 86rpx;
  border-radius: 16rpx;
  border: 2rpx solid #dbe3f2;
  background: #f7f9fd;
  margin-bottom: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}

.btn {
  height: 86rpx;
  border: 0;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(90deg, #5a8ff2 0%, #69d0dc 100%);
  box-shadow: 0 10rpx 20rpx rgba(82, 147, 238, 0.26);
}

.btn[disabled] {
  opacity: 0.7;
}
</style>
