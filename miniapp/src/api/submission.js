import { request, uploadSubmissionMultipart } from '../utils/http'

export async function listLatestSubmissions(assignmentId) {
  const data = await request(`/submissions/latest/${assignmentId}`, { method: 'GET' })
  return data?.items || []
}

export async function uploadSubmission(payload) {
  return uploadSubmissionMultipart(payload)
}
