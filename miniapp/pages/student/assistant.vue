<template>
  <view class="page">
    <view class="card header">
      <view>
        <view class="title">AI 助手</view>
        <view class="desc">同学你好，随时提问课程、作业与学习问题</view>
      </view>
    </view>

    <view class="card panel">
      <scroll-view class="messages" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
        <view v-for="(item, idx) in messages" :key="item.id" class="msg-row" :class="item.role">
          <view class="msg-bubble" :class="{ pending: item.pending }">
            <text class="msg-text" selectable>{{ item.pending ? '...' : item.content }}</text>
          </view>
          <view v-if="item.role === 'assistant' && item.content && !item.pending" class="msg-actions">
            <button class="action-btn" @click="copyMessage(item.content)">复制</button>
            <button class="action-btn" @click="retryMessage(idx)">重试</button>
          </view>
        </view>
      </scroll-view>

      <view v-if="attachments.length" class="composer-attachments">
        <view v-for="(item, idx) in attachments" :key="`${item.path}-${idx}`" class="attach-item">
          <image class="attach-img" :src="item.path" mode="aspectFill" />
          <view class="attach-del" @click="removeAttachment(idx)">×</view>
        </view>
      </view>

      <view class="composer-box">
        <textarea
          v-model="input"
          class="composer-input"
          placeholder="发送消息..."
          :disabled="sending"
          maxlength="4000"
          auto-height
        />
        <view class="composer-actions">
          <button class="circle-btn upload-btn" @click="pickImages">+</button>
          <button
            class="circle-btn send-btn"
            :disabled="sending || (!input.trim() && !attachments.length)"
            @click="sendMessage"
          >
            ↗
          </button>
        </view>
      </view>

      <view v-if="error" class="error">{{ error }}</view>
    </view>

    <StudentBottomNav active="ai" />
  </view>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { sendAssistantMessage, uploadAssistantImages } from '../../api/assistant'
import { getUser, requireStudent } from '../../utils/storage'
import StudentBottomNav from '../../components/StudentBottomNav.vue'

const input = ref('')
const sending = ref(false)
const error = ref('')
const scrollTop = ref(0)
const sessionId = ref('')
const attachments = ref([])
const messageSeed = ref(1)
const messages = ref([])

function resolveStorageKey(name) {
  const user = getUser()
  const role = String(user?.role || 'student').toLowerCase()
  const userId = user?.userId || 'anonymous'
  return `miniapp.assistant.${name}.${role}.${userId}`
}

function createSessionId() {
  return `mini-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function loadSession() {
  const key = resolveStorageKey('session')
  const existing = uni.getStorageSync(key)
  if (existing) {
    sessionId.value = existing
    return
  }
  const id = createSessionId()
  sessionId.value = id
  uni.setStorageSync(key, id)
}

function loadMessages() {
  const key = resolveStorageKey('messages')
  const raw = uni.getStorageSync(key)
  if (!raw) {
    messages.value = [
      {
        id: messageSeed.value++,
        role: 'assistant',
        content: '你好呀，有什么我可以帮你的吗？',
        pending: false,
      },
    ]
    return
  }

  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed) || !parsed.length) {
      throw new Error('empty')
    }
    messages.value = parsed.map((item, idx) => ({
      id: item.id || idx + 1,
      role: item.role === 'user' ? 'user' : 'assistant',
      content: String(item.content || ''),
      pending: false,
    }))
    const maxId = messages.value.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0)
    messageSeed.value = maxId + 1
  } catch {
    messages.value = [
      {
        id: messageSeed.value++,
        role: 'assistant',
        content: '你好呀，有什么我可以帮你的吗？',
        pending: false,
      },
    ]
  }
}

function persistMessages() {
  const key = resolveStorageKey('messages')
  const plain = messages.value.map((item) => ({
    id: item.id,
    role: item.role,
    content: item.content,
  }))
  uni.setStorageSync(key, plain)
}

function scrollToBottom() {
  nextTick(() => {
    scrollTop.value = Date.now()
  })
}

function pushMessage(role, content, pending = false) {
  const id = messageSeed.value++
  messages.value.push({ id, role, content, pending })
  persistMessages()
  scrollToBottom()
  return id
}

function updateMessage(id, payload) {
  const target = messages.value.find((item) => item.id === id)
  if (!target) return
  Object.assign(target, payload)
  persistMessages()
  scrollToBottom()
}

function clearAttachments() {
  attachments.value = []
}

function pickImages() {
  const remain = 4 - attachments.value.length
  if (remain <= 0) {
    uni.showToast({ title: '最多上传4张图片', icon: 'none' })
    return
  }
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const files = (res.tempFiles || []).map((file) => ({
        path: file.path || file.tempFilePath,
        name: (file.path || file.tempFilePath || '').split('/').pop() || 'image',
      }))
      attachments.value = [...attachments.value, ...files].slice(0, 4)
    },
  })
}

function removeAttachment(index) {
  attachments.value.splice(index, 1)
}

function inferMimeType(filePath) {
  const lower = String(filePath || '').toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.bmp')) return 'image/bmp'
  return 'image/jpeg'
}

function readLocalImageAsDataUrl(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const fs = uni.getFileSystemManager()
      fs.readFile({
        filePath,
        encoding: 'base64',
        success: (res) => {
          const mime = inferMimeType(filePath)
          resolve(`data:${mime};base64,${res.data || ''}`)
        },
        fail: () => reject(new Error('图片读取失败')),
      })
    } catch {
      reject(new Error('图片读取失败'))
    }
  })
}

async function buildImagesPayload() {
  if (!attachments.value.length) return []
  const paths = attachments.value.map((item) => item.path)

  try {
    const uploaded = await uploadAssistantImages(paths)
    if (uploaded.length === paths.length) {
      return uploaded.map((item) => ({ name: item.name, url: item.url }))
    }
  } catch {
    // Fallback to base64 payload when upload endpoint is unavailable.
  }

  const dataUrls = await Promise.all(paths.map((path) => readLocalImageAsDataUrl(path)))
  return attachments.value.map((item, idx) => ({
    name: item.name,
    dataUrl: dataUrls[idx],
  }))
}

async function sendByQuestion(question) {
  if (sending.value) return
  const text = String(question || '').trim()
  if (!text && !attachments.value.length) return

  const userContent = text || '请结合我上传的图片给出分析。'
  pushMessage('user', userContent, false)
  sending.value = true
  error.value = ''
  input.value = ''

  const assistantId = pushMessage('assistant', '', true)

  try {
    const images = await buildImagesPayload()
    const data = await sendAssistantMessage(userContent, {
      sessionId: sessionId.value,
      thinking: 'disabled',
      images,
    })
    const answer = data?.answer || '我暂时没有得到有效回复，请稍后再试。'
    updateMessage(assistantId, { content: answer, pending: false })
  } catch (err) {
    const message = err?.message || 'AI 服务暂时不可用，请稍后重试。'
    error.value = message
    updateMessage(assistantId, { content: message, pending: false })
  } finally {
    sending.value = false
    clearAttachments()
  }
}

async function sendMessage() {
  await sendByQuestion(input.value)
}

async function retryMessage(index) {
  if (sending.value) return
  let question = ''
  for (let i = index - 1; i >= 0; i -= 1) {
    if (messages.value[i]?.role === 'user' && messages.value[i]?.content) {
      question = messages.value[i].content
      break
    }
  }
  if (!question) {
    uni.showToast({ title: '没有可重试的问题', icon: 'none' })
    return
  }
  await sendByQuestion(question)
}

function copyMessage(content) {
  if (!content) return
  uni.setClipboardData({
    data: content,
    success: () => {
      uni.showToast({ title: '已复制', icon: 'none' })
    },
  })
}

onMounted(() => {
  if (!requireStudent()) return
  loadSession()
  loadMessages()
  scrollToBottom()
})
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
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12rpx 24rpx rgba(44, 57, 87, 0.1);
}

.header {
  padding: 28rpx;
}

.title {
  font-size: 42rpx;
  font-weight: 700;
  color: #1f2742;
}

.desc {
  margin-top: 6rpx;
  color: #79849a;
  font-size: 24rpx;
}

.panel {
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.messages {
  max-height: 66vh;
  min-height: 48vh;
  padding: 10rpx;
}

.msg-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 18rpx;
}

.msg-row.user {
  align-items: flex-end;
}

.msg-row.assistant {
  align-items: flex-start;
}

.msg-bubble {
  max-width: 84%;
  border-radius: 24rpx;
  padding: 20rpx 22rpx;
  border: 2rpx solid #dce4f5;
  background: #f3f6fc;
}

.msg-bubble.pending {
  opacity: 0.8;
}

.msg-row.user .msg-bubble {
  border: 0;
  background: linear-gradient(90deg, #5a8ff2 0%, #69d0dc 100%);
  box-shadow: 0 8rpx 18rpx rgba(80, 143, 240, 0.24);
}

.msg-text {
  color: #1f2a44;
  font-size: 30rpx;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.msg-row.user .msg-text {
  color: #fff;
  font-weight: 600;
}

.msg-actions {
  display: flex;
  gap: 12rpx;
  margin-top: 10rpx;
}

.action-btn {
  margin: 0;
  min-width: 112rpx;
  height: 54rpx;
  border-radius: 12rpx;
  border: 2rpx solid #d2def3;
  background: #eef3ff;
  color: #2f5ac1;
  font-size: 22rpx;
  font-weight: 700;
  line-height: 50rpx;
  padding: 0 18rpx;
}

.composer-attachments {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.attach-item {
  width: 96rpx;
  height: 96rpx;
  border-radius: 14rpx;
  border: 2rpx solid #dde6f7;
  overflow: hidden;
  position: relative;
}

.attach-img {
  width: 100%;
  height: 100%;
}

.attach-del {
  position: absolute;
  right: 4rpx;
  top: 4rpx;
  width: 28rpx;
  height: 28rpx;
  border-radius: 14rpx;
  background: rgba(18, 28, 44, 0.65);
  color: #fff;
  text-align: center;
  line-height: 26rpx;
  font-size: 20rpx;
}

.composer-box {
  min-height: 120rpx;
  border-radius: 36rpx;
  background: #f7f9fd;
  border: 2rpx solid #dfe6f4;
  box-shadow: 0 10rpx 24rpx rgba(30, 40, 63, 0.1);
  padding: 18rpx 20rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.composer-input {
  flex: 1;
  min-height: 78rpx;
  max-height: 200rpx;
  border: 0;
  background: transparent;
  font-size: 30rpx;
  color: #1f2a44;
  line-height: 1.4;
}

.composer-actions {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.circle-btn {
  margin: 0;
  width: 74rpx;
  height: 74rpx;
  border-radius: 37rpx;
  background: #fff;
  border: 4rpx solid #101a30;
  color: #101a30;
  font-size: 44rpx;
  font-weight: 700;
  line-height: 66rpx;
  text-align: center;
  padding: 0;
}

.send-btn {
  font-size: 36rpx;
}

.circle-btn[disabled] {
  opacity: 0.45;
}

.action-btn::after,
.circle-btn::after {
  border: none;
}

.error {
  font-size: 24rpx;
  color: #d75656;
}
</style>
