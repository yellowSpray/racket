export interface PlayerStanding {
  playerId: string
  playerName: string
  rank: number
  played: number
  wins: number
  losses: number
  walkoversWon: number
  walkoversLost: number
  points: number
}

export interface GroupStandings {
  groupId: string
  groupName: string
  standings: PlayerStanding[]
}

export interface PromotionMove {
  playerId: string
  playerName: string
  fromGroupId: string
  fromGroupName: string
  toGroupId: string
  toGroupName: string
  type: "promotion" | "relegation"
}

export interface PromotionResult {
  moves: PromotionMove[]
  stayingPlayers: { playerId: string; groupId: string }[]
}
