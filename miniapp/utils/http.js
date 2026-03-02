import { clearAuth, getAccessToken, getRefreshToken, setAuth, getUser } from './storage'

const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/v1'
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL

function buildUrl(path) {
  if (/^https?:\/\//.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalized}`
}

export function toAbsoluteUrl(path = '') {
  const value = String(path || '').trim()
  if (!value) return ''
  if (/^https?:\/\//.test(value)) return value
  const normalized = value.startsWith('/') ? value : `/${value}`
  try {
    const base = new URL(API_BASE_URL)
    return `${base.origin}${normalized}`
  } catch {
    return normalized
  }
}

function requestRaw(path, options = {}) {
  const {
    method = 'GET',
    data,
    headers = {},
  } = options
  return new Promise((resolve, reject) => {
    uni.request({
      url: buildUrl(path),
      method,
      data,
      header: headers,
      success: (res) => resolve(res),
      fail: (err) => reject(err),
    })
  })
}

let refreshPromise = null

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return ''
    const res = await requestRaw('/auth/refresh', {
      method: 'POST',
      data: { refreshToken },
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.statusCode < 200 || res.statusCode >= 300 || !res.data?.data?.accessToken) {
      clearAuth()
      return ''
    }
    const user = getUser()
    setAuth({
      accessToken: res.data.data.accessToken,
      refreshToken: res.data.data.refreshToken || refreshToken,
      user,
    })
    return res.data.data.accessToken
  })()
  const token = await refreshPromise
  refreshPromise = null
  return token
}

export async function request(path, options = {}) {
  const {
    method = 'GET',
    data,
    auth = true,
    headers = {},
    skipRefresh = false,
  } = options

  const finalHeaders = { ...headers }
  const token = getAccessToken()
  if (auth && token) {
    finalHeaders.Authorization = `Bearer ${token}`
  }
  if (!finalHeaders['Content-Type'] && method !== 'GET') {
    finalHeaders['Content-Type'] = 'application/json'
  }

  const res = await requestRaw(path, { method, data, headers: finalHeaders })
  if (res.statusCode >= 200 && res.statusCode < 300) {
    return res.data
  }

  if (
    auth &&
    !skipRefresh &&
    (res.statusCode === 401 || res.statusCode === 403) &&
    !path.includes('/auth/login') &&
    !path.includes('/auth/refresh')
  ) {
    const nextToken = await refreshAccessToken()
    if (nextToken) {
      return request(path, {
        ...options,
        skipRefresh: true,
        headers: {
          ...headers,
          Authorization: `Bearer ${nextToken}`,
        },
      })
    }
  }

  const message = res?.data?.message || `请求失败(${res.statusCode})`
  throw new Error(Array.isArray(message) ? message.join('；') : message)
}

export function uploadSubmissionMultipart({ assignmentId, answers, fileEntries }) {
  if (!fileEntries.length) {
    return request('/submissions/upload', {
      method: 'POST',
      data: {
        assignmentId,
        answers: JSON.stringify(answers),
      },
    })
  }

  const token = getAccessToken()
  return new Promise((resolve, reject) => {
    const url = buildUrl('/submissions/upload')
    const formData = {
      assignmentId,
      answers: JSON.stringify(answers),
    }

    if (fileEntries.length <= 1) {
      const only = fileEntries[0]
      uni.uploadFile({
        url,
        filePath: only?.path || '',
        name: only ? `files[${only.questionId}]` : 'files',
        formData,
        header: token ? { Authorization: `Bearer ${token}` } : {},
        success: (res) => {
          try {
            resolve(JSON.parse(res.data || '{}'))
          } catch (err) {
            reject(new Error('提交响应解析失败'))
          }
        },
        fail: (err) => reject(err),
      })
      return
    }

    const files = fileEntries.map((entry) => ({
      name: `files[${entry.questionId}]`,
      uri: entry.path,
    }))

    uni.uploadFile({
      url,
      files,
      name: 'files',
      formData,
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        try {
          resolve(JSON.parse(res.data || '{}'))
        } catch (err) {
          reject(new Error('提交响应解析失败'))
        }
      },
      fail: (err) => reject(err),
    })
  })
}
