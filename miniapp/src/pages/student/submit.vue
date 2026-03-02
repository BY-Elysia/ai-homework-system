<template>
  <view class="page">
    <view class="card header">
      <view>
        <view class="title">作业提交</view>
        <view class="desc">{{ assignment.title || '未命名作业' }}</view>
      </view>
      <button class="ghost header-action" @click="goBack">返回</button>
    </view>

    <view class="card section" v-if="visibleBlocked">
      <view class="empty">教师设置提交后暂不可见</view>
    </view>

    <view v-else class="layout">
      <view class="card index-card">
        <view class="index-title">题号</view>
        <view class="index-list">
          <view
            v-for="(q, idx) in questions"
            :key="q.questionId"
            class="index-item"
            :class="{ active: idx === currentIndex }"
            @click="currentIndex = idx"
          >
            {{ idx + 1 }}
          </view>
        </view>
      </view>

      <view class="card section content-card" v-if="currentQuestion">
        <view class="prompt">
          <rich-text :nodes="renderPrompt(currentQuestion)"></rich-text>
        </view>

        <view v-if="isSingleChoice(currentQuestion)" class="choice-list">
          <label
            v-for="opt in getOptions(currentQuestion)"
            :key="opt.id"
            class="choice-item"
          >
            <radio
              :value="opt.id"
              :checked="getAnswerPayload(currentQuestion.questionId).optionIds?.[0] === opt.id"
              @click="setSingleChoice(currentQuestion.questionId, opt.id)"
            />
            <text>{{ opt.id }}. {{ formatOptionText(opt.text) }}</text>
          </label>
        </view>

        <view v-else-if="isMultiChoice(currentQuestion)" class="choice-list">
          <label v-for="opt in getOptions(currentQuestion)" :key="opt.id" class="choice-item">
            <checkbox
              :value="opt.id"
              :checked="(getAnswerPayload(currentQuestion.questionId).optionIds || []).includes(opt.id)"
              @click="toggleMultiChoice(currentQuestion.questionId, opt.id)"
            />
            <text>{{ opt.id }}. {{ formatOptionText(opt.text) }}</text>
          </label>
        </view>

        <view v-else-if="isFillBlank(currentQuestion)">
          <view class="blank-list">
            <input
              v-for="(_, idx) in getBlankCount(currentQuestion)"
              :key="idx"
              class="input"
              :placeholder="`填空 ${idx + 1}`"
              :value="getBlankAnswers(currentQuestion.questionId)[idx] || ''"
              @input="setBlankAnswer(currentQuestion.questionId, idx, $event.detail.value)"
            />
          </view>
        </view>

        <view v-else>
          <textarea
            class="textarea"
            placeholder="请输入作答内容"
            :value="answers[currentQuestion.questionId]?.contentText || ''"
            @input="setTextAnswer(currentQuestion.questionId, $event.detail.value)"
          ></textarea>
        </view>

        <view class="upload-box">
          <view class="upload-header">
            <text>图片（最多4张）</text>
            <button class="small-btn" @click="pickImages(currentQuestion.questionId)">添加图片</button>
          </view>
          <view class="img-list" v-if="(answers[currentQuestion.questionId]?.images || []).length">
            <view
              v-for="(img, idx) in answers[currentQuestion.questionId]?.images || []"
              :key="img.path"
              class="img-item"
            >
              <image class="img" :src="img.path" mode="aspectFill" />
              <view class="img-del" @click="removeImage(currentQuestion.questionId, idx)">x</view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="!visibleBlocked" class="footer">
      <button class="btn" :disabled="submitting || finalized" :class="{ disabled: finalized }" @click="submitAll">
        {{ finalized ? '已评分不可再提交' : submitting ? '提交中...' : '提交作业' }}
      </button>
    </view>

    <StudentBottomNav active="assignments" />
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getAssignment, getAssignmentSnapshot } from '../../api/assignment'
import { listLatestSubmissions, uploadSubmission } from '../../api/submission'
import { requireStudent } from '../../utils/storage'
import StudentBottomNav from '../../components/StudentBottomNav.vue'
import { toAbsoluteUrl } from '../../utils/http'

const assignmentId = ref('')
const assignment = ref({})
const questions = ref([])
const currentIndex = ref(0)
const answers = ref({})
const submitting = ref(false)
const finalized = ref(false)

const currentQuestion = computed(() => questions.value[currentIndex.value] || null)
const visibleBlocked = computed(() => {
  return assignment.value.visibleAfterSubmit === false && hasAnySubmitted.value
})

const hasAnySubmitted = ref(false)

onMounted(async () => {
  if (!requireStudent()) return
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  assignmentId.value = current?.options?.assignmentId || ''
  await Promise.all([fetchAssignment(), fetchSnapshot(), fetchLatest()])
})

async function fetchAssignment() {
  try {
    assignment.value = await getAssignment(assignmentId.value)
  } catch (err) {
    uni.showToast({ title: err.message || '作业加载失败', icon: 'none' })
  }
}

async function fetchSnapshot() {
  try {
    const snapshot = await getAssignmentSnapshot(assignmentId.value)
    const sorted = [...(snapshot.questions || [])].sort((a, b) => a.questionIndex - b.questionIndex)
    questions.value = sorted
    sorted.forEach((q) => {
      if (!answers.value[q.questionId]) {
        answers.value[q.questionId] = {
          questionId: q.questionId,
          contentText: '',
          answerPayload: {},
          answerFormat: q.questionType || 'SHORT_ANSWER',
          images: [],
        }
      }
    })
  } catch (err) {
    uni.showToast({ title: err.message || '题目加载失败', icon: 'none' })
  }
}

async function fetchLatest() {
  try {
    const items = await listLatestSubmissions(assignmentId.value)
    if (!items?.length) return
    hasAnySubmitted.value = true
    items.forEach((item) => {
      if (!answers.value[item.questionId]) {
        answers.value[item.questionId] = {
          questionId: item.questionId,
          contentText: '',
          answerPayload: {},
          answerFormat: 'SHORT_ANSWER',
          images: [],
        }
      }
      answers.value[item.questionId].contentText = item.contentText || ''
      answers.value[item.questionId].answerPayload = item.answerPayload || {}
      answers.value[item.questionId].answerFormat = item.answerFormat || answers.value[item.questionId].answerFormat
      answers.value[item.questionId].images = (item.fileUrls || []).map((url) => ({
        path: toAbsoluteUrl(url),
        remote: true,
      }))
      if (item.isFinal) finalized.value = true
    })
  } catch (err) {
    // Ignore latest submission read failure to avoid blocking first-time submit.
  }
}

function questionPrompt(q) {
  const prompt = q.prompt
  if (!prompt) return ''
  if (typeof prompt === 'string') return prompt
  return prompt.text || ''
}

function toSuperscript(text = '') {
  const map = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', 'n': 'ⁿ', 'i': 'ⁱ' }
  return String(text).split('').map((ch) => map[ch] || ch).join('')
}

function toSubscript(text = '') {
  const map = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎' }
  return String(text).split('').map((ch) => map[ch] || ch).join('')
}

const LATEX_SYMBOL_MAP = {
  in: '∈',
  notin: '∉',
  forall: '∀',
  exists: '∃',
  subset: '⊂',
  subseteq: '⊆',
  supset: '⊃',
  supseteq: '⊇',
  geq: '≥',
  geqslant: '≥',
  leq: '≤',
  leqslant: '≤',
  neq: '≠',
  times: '×',
  cdot: '·',
  div: '÷',
  pm: '±',
  to: '→',
  cdots: '⋯',
  infty: '∞',
  pi: 'π',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  theta: 'θ',
  epsilon: 'ϵ',
  varepsilon: 'ε',
  lambda: 'λ',
  mu: 'μ',
  sigma: 'σ',
  Delta: 'Δ',
  degree: '°',
}

const LATEX_TEXT_COMMANDS = new Set([
  'sin',
  'cos',
  'tan',
  'cot',
  'sec',
  'csc',
  'log',
  'ln',
  'min',
  'max',
  'lim',
])

function latexToReadable(input = '') {
  const source = String(input)
    .replace(/\\\\/g, '\\')
    .replace(/\\,/g, ' ')
    .replace(/\\!/g, '')

  let index = 0

  const isAlpha = (char) => /[a-zA-Z]/.test(char || '')

  const skipSpaces = () => {
    while (index < source.length && /\s/.test(source[index])) {
      index += 1
    }
  }

  const parseArgument = () => {
    skipSpaces()
    if (index >= source.length) return ''
    if (source[index] === '{') {
      index += 1
      return parseUntil('}')
    }
    if (source[index] === '\\') {
      return parseCommand()
    }
    const value = source[index]
    index += 1
    return value
  }

  const parseOptionalDegree = () => {
    skipSpaces()
    if (source[index] !== '[') return ''
    index += 1
    let depth = 1
    let value = ''
    while (index < source.length && depth > 0) {
      const char = source[index]
      if (char === '[') {
        depth += 1
        value += char
        index += 1
        continue
      }
      if (char === ']') {
        depth -= 1
        index += 1
        if (depth > 0) value += char
        continue
      }
      value += char
      index += 1
    }
    return latexToReadable(value)
  }

  const parseCommand = () => {
    index += 1
    if (index >= source.length) return ''

    if (!isAlpha(source[index])) {
      const char = source[index]
      index += 1
      return char
    }

    const commandStart = index
    while (index < source.length && isAlpha(source[index])) {
      index += 1
    }
    const command = source.slice(commandStart, index)

    if (command === 'frac') {
      const numerator = parseArgument()
      const denominator = parseArgument()
      return `(${numerator})/(${denominator})`
    }

    if (command === 'sqrt') {
      const degree = parseOptionalDegree()
      const body = parseArgument()
      const value = `√(${body})`
      return degree ? `${degree}${value}` : value
    }

    if (command === 'left' || command === 'right' || command === 'displaystyle') {
      return ''
    }

    if (command === 'text' || command === 'mathrm' || command === 'operatorname') {
      return parseArgument()
    }

    if (command === 'mathbb') {
      const token = parseArgument()
      const blackboard = {
        R: 'ℝ',
        N: 'ℕ',
        Z: 'ℤ',
        Q: 'ℚ',
        C: 'ℂ',
      }
      return blackboard[token] || token
    }

    if (LATEX_SYMBOL_MAP[command]) {
      return LATEX_SYMBOL_MAP[command]
    }

    if (LATEX_TEXT_COMMANDS.has(command)) {
      return command
    }

    return command
  }

  const parseScript = (marker) => {
    index += 1
    const body = parseArgument()
    if (marker === '^') return toSuperscript(body)
    return toSubscript(body)
  }

  const parseUntil = (endChar = '') => {
    let result = ''
    while (index < source.length) {
      const char = source[index]
      if (endChar && char === endChar) {
        index += 1
        break
      }
      if (char === '\\') {
        result += parseCommand()
        continue
      }
      if (char === '^' || char === '_') {
        result += parseScript(char)
        continue
      }
      if (char === '{') {
        index += 1
        result += parseUntil('}')
        continue
      }
      if (char === '}') {
        if (!endChar) {
          index += 1
          continue
        }
        break
      }
      result += char
      index += 1
    }
    return result
  }

  return parseUntil('').replace(/\s+/g, ' ').trim()
}

function escapeHtml(input = '') {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderMixedText(raw = '') {
  const source = String(raw)
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')
  const parts = source.split(/(\$\$[\s\S]+?\$\$|\$[^$]+\$)/g)
  return parts.map((part) => {
    if (!part) return ''
    if ((part.startsWith('$$') && part.endsWith('$$')) || (part.startsWith('$') && part.endsWith('$'))) {
      const pure = part.startsWith('$$') ? part.slice(2, -2) : part.slice(1, -1)
      const readable = escapeHtml(latexToReadable(pure))
      return `<span style="display:inline-block;padding:2px 6px;margin:0 4px;border-radius:8px;background:#f2f5ff;color:#1f3665;font-family:Times New Roman, serif;">${readable}</span>`
    }
    return escapeHtml(part).replace(/\n/g, '<br/>')
  }).join('')
}

function renderPrompt(question) {
  return renderMixedText(questionPrompt(question))
}

function formatOptionText(text) {
  const raw = String(text || '').trim()
  const wrapped = raw.startsWith('$') && raw.endsWith('$')
    ? raw.slice(1, -1)
    : raw
  return latexToReadable(wrapped)
}

function getSchema(q) {
  return q.questionSchema || {}
}

function isSingleChoice(q) {
  return q.questionType === 'SINGLE_CHOICE' || q.questionType === 'JUDGE'
}

function isMultiChoice(q) {
  return q.questionType === 'MULTI_CHOICE'
}

function isFillBlank(q) {
  return q.questionType === 'FILL_BLANK'
}

function getOptions(q) {
  const schema = getSchema(q)
  if (q.questionType === 'JUDGE' && (!schema.options || !schema.options.length)) {
    return [
      { id: 'A', text: '对' },
      { id: 'B', text: '错' },
    ]
  }
  return schema.options || []
}

function getAnswerPayload(questionId) {
  return answers.value[questionId]?.answerPayload || {}
}

function setSingleChoice(questionId, optionId) {
  answers.value[questionId].answerPayload = { optionIds: [optionId] }
}

function toggleMultiChoice(questionId, optionId) {
  const current = new Set(getAnswerPayload(questionId).optionIds || [])
  if (current.has(optionId)) {
    current.delete(optionId)
  } else {
    current.add(optionId)
  }
  answers.value[questionId].answerPayload = { optionIds: [...current] }
}

function getBlankCount(q) {
  const schema = getSchema(q)
  if (typeof schema.blankCount === 'number' && schema.blankCount > 0) {
    return schema.blankCount
  }
  return 1
}

function getBlankAnswers(questionId) {
  return getAnswerPayload(questionId).blanks || []
}

function setBlankAnswer(questionId, index, value) {
  const blanks = [...getBlankAnswers(questionId)]
  blanks[index] = value
  answers.value[questionId].answerPayload = { blanks }
}

function setTextAnswer(questionId, value) {
  answers.value[questionId].contentText = value
}

function pickImages(questionId) {
  const current = answers.value[questionId]?.images || []
  const remain = 4 - current.length
  if (remain <= 0) {
    uni.showToast({ title: '图片最多提交4张', icon: 'none' })
    return
  }
  uni.chooseImage({
    count: remain,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const files = (res.tempFiles || []).map((f) => ({ path: f.path || f.tempFilePath, remote: false }))
      answers.value[questionId].images = [...current, ...files].slice(0, 4)
    },
  })
}

function removeImage(questionId, index) {
  const current = [...(answers.value[questionId]?.images || [])]
  current.splice(index, 1)
  answers.value[questionId].images = current
}

async function submitAll() {
  if (finalized.value) return
  submitting.value = true
  try {
    const payloadAnswers = questions.value.map((q) => {
      const answer = answers.value[q.questionId] || {}
      return {
        questionId: q.questionId,
        contentText: answer.contentText || '',
        answerPayload: answer.answerPayload || null,
        answerFormat: answer.answerFormat || q.questionType || 'SHORT_ANSWER',
      }
    })

    const fileEntries = []
    questions.value.forEach((q) => {
      const images = answers.value[q.questionId]?.images || []
      images.filter((img) => !img.remote).forEach((img) => {
        fileEntries.push({
          questionId: q.questionId,
          path: img.path,
        })
      })
    })

    if (fileEntries.length > 4) {
      uni.showToast({ title: '图片最多提交4张', icon: 'none' })
      submitting.value = false
      return
    }

    await uploadSubmission({
      assignmentId: assignmentId.value,
      answers: payloadAnswers,
      fileEntries,
    })
    hasAnySubmitted.value = true
    uni.showToast({ title: '已提交', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 600)
  } catch (err) {
    uni.showToast({ title: err.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
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
  padding-bottom: 190rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.card {
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 12rpx 24rpx rgba(44, 57, 87, 0.1);
}

.header {
  padding: 26rpx;
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
  font-size: 24rpx;
  color: #76839c;
}

.ghost {
  border-radius: 16rpx;
  border: 2rpx solid #d7ddeb;
  background: #fff;
  color: #4b556d;
  font-size: 24rpx;
  height: 68rpx;
  padding: 0 22rpx;
}

.layout {
  display: flex;
  gap: 16rpx;
}

.index-card {
  width: 120rpx;
  padding: 18rpx;
  height: fit-content;
}

.index-title {
  color: #7a849a;
  font-size: 24rpx;
}

.index-list {
  margin-top: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.index-item {
  border-radius: 14rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eff4ff;
  color: #5978b8;
  font-weight: 700;
}

.index-item.active {
  background: linear-gradient(90deg, #5a8ff2 0%, #69d0dc 100%);
  box-shadow: 0 6rpx 12rpx rgba(82, 147, 238, 0.24);
  color: #fff;
}

.content-card {
  flex: 1;
  padding: 22rpx;
}

.prompt {
  font-size: 30rpx;
  color: #1f2742;
  margin-bottom: 16rpx;
  line-height: 1.6;
}

.choice-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.choice-item {
  display: flex;
  align-items: center;
  gap: 10rpx;
  color: #2e364d;
}

.blank-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.input {
  height: 76rpx;
  border-radius: 14rpx;
  border: 2rpx solid #dde4f2;
  padding: 0 20rpx;
  background: #f8fbff;
}

.textarea {
  width: 100%;
  min-height: 260rpx;
  border-radius: 16rpx;
  border: 2rpx solid #dbe4f5;
  background: #f8fbff;
  padding: 16rpx;
}

.upload-box {
  margin-top: 14rpx;
}

.upload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
  color: #65748e;
  font-size: 24rpx;
}

.small-btn {
  margin: 0;
  border: 0;
  height: 56rpx;
  border-radius: 12rpx;
  font-size: 22rpx;
  color: #fff;
  background: linear-gradient(90deg, #5a8ff2 0%, #69d0dc 100%);
  box-shadow: 0 8rpx 14rpx rgba(82, 147, 238, 0.22);
  padding: 0 14rpx;
}

.img-list {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.img-item {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  overflow: hidden;
  position: relative;
  border: 2rpx solid #dde4f4;
}

.img {
  width: 100%;
  height: 100%;
}

.img-del {
  position: absolute;
  right: 4rpx;
  top: 4rpx;
  width: 30rpx;
  height: 30rpx;
  border-radius: 50%;
  background: rgba(20, 26, 40, 0.6);
  color: #fff;
  text-align: center;
  line-height: 30rpx;
  font-size: 18rpx;
}

.footer {
  display: flex;
  justify-content: center;
  margin-bottom: 6rpx;
}

.btn {
  width: 100%;
  height: 82rpx;
  border-radius: 18rpx;
  border: 0;
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  background: linear-gradient(90deg, #5a8ff2 0%, #69d0dc 100%);
  box-shadow: 0 10rpx 20rpx rgba(82, 147, 238, 0.24);
}

.btn.disabled {
  background: #b8c6df;
  color: #eef3ff;
}

.section {
  padding: 24rpx;
}

.empty {
  color: #7e8aa2;
  text-align: center;
  padding: 28rpx;
}
</style>
