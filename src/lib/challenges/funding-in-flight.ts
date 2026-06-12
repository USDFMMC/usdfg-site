/** Module-level guards: suppress deadline auto-handlers during active fund flows. */

let joinerFundingInFlight: string | null = null;
let creatorFundingInFlight: string | null = null;

export function markJoinerFundingInFlight(challengeId: string | null): void {
  joinerFundingInFlight = challengeId;
}

export function markCreatorFundingInFlight(challengeId: string | null): void {
  creatorFundingInFlight = challengeId;
}

export function isJoinerFundingInFlight(challengeId: string): boolean {
  return joinerFundingInFlight === challengeId;
}

export function isCreatorFundingInFlight(challengeId: string): boolean {
  return creatorFundingInFlight === challengeId;
}
