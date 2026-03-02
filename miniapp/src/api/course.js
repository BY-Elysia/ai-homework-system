import { listAllAssignments } from './assignment'
import { listMyScores } from './score'

export async function listCourses() {
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
    const course = map.get(courseId)
    course.assignmentCount += 1
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
    const course = map.get(courseId)
    if (item.status === 'GRADED') {
      course.gradedCount += 1
    }
  })

  return Array.from(map.values())
}
