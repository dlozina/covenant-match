// Re-export all types from types.ts
export * from './types';

// Re-export all errors from errors.ts
export * from './errors';

// Re-export the HTTP client
export * from './http-client';

// Re-export all services
export { authService } from './auth-service';
export { userService } from './user-service';
export { sessionService } from './session-service';
export { gameDataService } from './game-data-service';

// Legacy export aliases for backward compatibility
// These will map old function names to new service methods

// Auth functions
export const login = (data) => authService.login(data);
export const register = (data) => authService.register(data);

// User management functions
export const updateProfile = (data) => userService.updateProfile(data);
export const deleteProfile = () => userService.deleteProfile();

// Session management functions
export const fetchSessions = (isLoggedIn, currentPage, limit, statusFilter) => 
  sessionService.fetchSessions(isLoggedIn, currentPage, limit, statusFilter);
export const fetchSessionDetail = (sessionId) => sessionService.fetchSessionDetail(sessionId);
export const createSession = (data) => sessionService.createSession(data);
export const joinSession = (sessionId, nightfarer, userId, username, covenantName) => 
  sessionService.joinSession(sessionId, nightfarer, userId, username, covenantName);
export const recreateSession = (sessionId) => sessionService.recreateSession(sessionId);
export const updateSessionCharacters = (sessionId, nightLord, hostNightfarer) => 
  sessionService.updateSessionCharacters(sessionId, nightLord, hostNightfarer);

// Add Legacy session functions from sessions.ts
export const fetchAvailableSessions = () => sessionService.fetchAvailableSessions();
export const createLegacySession = (data) => sessionService.createLegacySession(data);
export const joinLegacySession = (sessionId, userData) => sessionService.joinLegacySession(sessionId, userData);
export const submitResult = (sessionId, resultData) => sessionService.submitResult(sessionId, resultData);
export const getSessionById = (sessionId) => sessionService.getSessionById(sessionId);
export const startSession = (sessionId) => sessionService.startSession(sessionId);

// Game data functions
export const fetchGameData = () => gameDataService.fetchGameData();
export const fetchLeaderboard = () => gameDataService.fetchLeaderboard();
export const fetchUserSessionHistory = () => gameDataService.fetchUserSessionHistory();
export const fetchUserSessionHistoryPaginated = (page, limit) => 
  gameDataService.fetchUserSessionHistoryPaginated(page, limit);
export const fetchSessionDetails = (sessionId) => gameDataService.fetchSessionDetails(sessionId);
export const fetchNightLords = () => gameDataService.fetchNightLords();
export const fetchNightfarers = () => gameDataService.fetchNightfarers();
export const fetchActiveSessionsCount = () => gameDataService.fetchActiveSessionsCount();
export const fetchSessionsCount = (status) => gameDataService.fetchSessionsCount(status);
export const fetchCovenantStats = () => gameDataService.fetchCovenantStats(); 