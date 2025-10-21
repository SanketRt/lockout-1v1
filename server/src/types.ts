export type CFProblem = {
contestId: number
index: string
name: string
rating?: number
}


export type RoomDTO = {
code: string
p1Handle: string
p2Handle: string
ratingMin: number
ratingMax: number
problemCount: number
durationMinutes: number
}