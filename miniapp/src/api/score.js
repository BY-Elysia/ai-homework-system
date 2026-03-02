import { request } from '../utils/http'

export async function listMyScores() {
  const data = await request('/scores/me', { method: 'GET' })
  return data?.items || []
}

export async function getMyScoreDetail(assignmentId) {
  return request(`/scores/me/${assignmentId}`, { method: 'GET' })
}
