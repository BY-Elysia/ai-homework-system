import { request } from '../utils/http'
import { ensureDeviceId, setAuth } from '../utils/storage'

export async function login(payload) {
  const data = await request('/auth/login', {
    method: 'POST',
    auth: false,
    data: {
      ...payload,
      deviceId: ensureDeviceId(),
    },
  })
  const token = data?.data?.token
  const user = data?.data?.user
  if (!token?.accessToken || !token?.refreshToken || !user) {
    throw new Error('登录响应不完整')
  }
  setAuth({
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    user,
  })
  return user
}

export async function me() {
  return request('/auth/me', { method: 'GET' })
}
