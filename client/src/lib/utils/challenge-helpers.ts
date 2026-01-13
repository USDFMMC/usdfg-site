/**
 * Challenge Helper Utilities
 * Centralized functions for extracting and validating challenge data
 * Reduces code duplication across multiple files
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Get challenge status with fallback to rawData
 */
export function getChallengeStatus(challenge: any): string {
  return challenge?.status || challenge?.rawData?.status || 'unknown';
}

/**
 * Get challenge creator wallet address
 */
export function getChallengeCreator(challenge: any): string {
  return challenge?.creator || challenge?.rawData?.creator || '';
}

/**
 * Check if a wallet is the challenge creator
 */
export function isChallengeCreator(challenge: any, wallet: string): boolean {
  const creator = getChallengeCreator(challenge);
  if (!creator || !wallet) return false;
  return creator.toLowerCase() === wallet.toLowerCase();
}

/**
 * Get challenge entry fee (challenge amount)
 */
export function getChallengeEntryFee(challenge: any): number {
  return challenge?.entryFee || challenge?.rawData?.entryFee || challenge?.challengeAmount || 0;
}

/**
 * Get challenge prize pool (challenge reward)
 */
export function getChallengePrizePool(challenge: any): number {
  return challenge?.prizePool || 
         challenge?.challengeReward || 
         challenge?.rawData?.prizePool || 
         challenge?.rawData?.challengeReward || 
         (getChallengeEntryFee(challenge) * 2);
}

/**
 * Get challenge PDA
 */
export function getChallengePDA(challenge: any): string | null {
  return challenge?.pda || challenge?.rawData?.pda || null;
}

/**
 * Get challenge challenger wallet address
 */
export function getChallengeChallenger(challenge: any): string | null {
  return challenge?.challenger || challenge?.rawData?.challenger || null;
}

/**
 * Check if a wallet is the challenge challenger
 */
export function isChallengeChallenger(challenge: any, wallet: string): boolean {
  const challenger = getChallengeChallenger(challenge);
  if (!challenger || !wallet) return false;
  return challenger.toLowerCase() === wallet.toLowerCase();
}

/**
 * Get challenge pending joiner wallet address
 */
export function getChallengePendingJoiner(challenge: any): string | null {
  return challenge?.pendingJoiner || challenge?.rawData?.pendingJoiner || null;
}

/**
 * Check if a wallet is the pending joiner
 */
export function isPendingJoiner(challenge: any, wallet: string): boolean {
  const pendingJoiner = getChallengePendingJoiner(challenge);
  if (!pendingJoiner || !wallet) return false;
  return pendingJoiner.toLowerCase() === wallet.toLowerCase();
}

/**
 * Get creator funding deadline
 */
export function getCreatorFundingDeadline(challenge: any): Timestamp | null {
  return challenge?.rawData?.creatorFundingDeadline || 
         challenge?.creatorFundingDeadline || 
         null;
}

/**
 * Get joiner funding deadline
 */
export function getJoinerFundingDeadline(challenge: any): Timestamp | null {
  return challenge?.rawData?.joinerFundingDeadline || 
         challenge?.joinerFundingDeadline || 
         null;
}

/**
 * Check if creator funding deadline has expired
 */
export function isCreatorFundingDeadlineExpired(challenge: any): boolean {
  const deadline = getCreatorFundingDeadline(challenge);
  if (!deadline) return false;
  return deadline.toMillis() < Date.now();
}

/**
 * Check if joiner funding deadline has expired
 */
export function isJoinerFundingDeadlineExpired(challenge: any): boolean {
  const deadline = getJoinerFundingDeadline(challenge);
  if (!deadline) return false;
  return deadline.toMillis() < Date.now();
}

/**
 * Check if challenge is in active state
 */
export function isChallengeActive(status: string): boolean {
  return status === 'active';
}

/**
 * Check if challenge is waiting for players
 */
export function isChallengeWaitingForPlayers(status: string): boolean {
  return status === 'pending_waiting_for_opponent' || 
         status === 'creator_confirmation_required' || 
         status === 'creator_funded';
}

/**
 * Check if challenge is in progress (active or waiting for players)
 */
export function isChallengeInProgress(status: string): boolean {
  return isChallengeActive(status) || isChallengeWaitingForPlayers(status);
}

/**
 * Check if challenge is completed
 */
export function isChallengeCompleted(status: string): boolean {
  return status === 'completed';
}

/**
 * Check if challenge can be cancelled
 */
export function canCancelChallenge(challenge: any): boolean {
  const status = getChallengeStatus(challenge);
  return status === 'pending_waiting_for_opponent' || 
         status === 'creator_confirmation_required';
}

/**
 * Get challenge ID
 */
export function getChallengeId(challenge: any): string | null {
  return challenge?.id || null;
}

/**
 * Get challenge title
 */
export function getChallengeTitle(challenge: any): string {
  return challenge?.title || challenge?.rawData?.title || 'Challenge';
}

/**
 * Get challenge game name
 */
export function getChallengeGame(challenge: any): string {
  return challenge?.game || challenge?.rawData?.game || 'Unknown Game';
}

/**
 * Get challenge format (standard or tournament)
 */
export function getChallengeFormat(challenge: any): 'standard' | 'tournament' {
  return challenge?.format || 
         challenge?.rawData?.format || 
         (challenge?.tournament ? 'tournament' : 'standard');
}

/**
 * Check if challenge is a tournament
 */
export function isTournamentChallenge(challenge: any): boolean {
  return getChallengeFormat(challenge) === 'tournament';
}
