export interface Match {
    id: string
    group_id: string
    player1_id: string
    player2_id: string
    match_date: string
    match_time: string
    court_number: string | null
    winner_id: string | null
    score: string | null
    created_at?: string
    updated_at?: string
    player1?: { id: string; first_name: string; last_name: string }
    player2?: { id: string; first_name: string; last_name: string }
    group?: { id: string; group_name: string; event_id: string }
}

export interface MatchPairing {
    groupId: string
    groupName: string
    player1Id: string
    player2Id: string
    player1Name: string
    player2Name: string
}

export interface MatchAssignment extends MatchPairing {
    matchDate: string
    matchTime: string
    courtNumber: string
    absentPlayerIds?: string[]
}
