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
