// Define types for our state and actions
export interface SessionState {
    isSessionStarted: boolean;
    isSessionFinished: boolean;
    elapsedSeconds: number;
    finalDuration: number | null;
  }
  
  export type SessionAction = 
    | { type: 'START_SESSION' }
    | { type: 'UPDATE_ELAPSED'; payload: number }
    | { type: 'FINISH_SESSION' }
    | { type: 'RESTORE_SESSION'; payload: Partial<SessionState> }
    | { type: 'RESET_SESSION' };
  
  export interface FriendState {
    [playerId: string]: boolean;
  }
  
  export type FriendAction = { type: 'ADD_FRIEND'; payload: string };
  
  export interface DialogState {
    showConfirmDialog: boolean;
    showWarningDialog: boolean;
  }
  
  export type DialogAction = 
    | { type: 'SHOW_CONFIRM' }
    | { type: 'HIDE_CONFIRM' }
    | { type: 'SHOW_WARNING' }
    | { type: 'HIDE_WARNING' };
  
  export interface ResultState {
    selectedResult: string;
    rating: number;
    feedback?: string;
  }
  
  export type ResultAction = 
    | { type: 'SELECT_RESULT'; payload: string }
    | { type: 'SET_RATING'; payload: number }
    | { type: 'SET_FEEDBACK'; payload: string };
  
  // Session state initial value
  export const initialSessionState: SessionState = {
    isSessionStarted: false,
    isSessionFinished: false,
    elapsedSeconds: 0,
    finalDuration: null,
  };
  
  // Session reducer
  export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
    switch (action.type) {
      case 'START_SESSION':
        return {
          ...state,
          isSessionStarted: true,
          isSessionFinished: false,
          finalDuration: null
        };
      case 'UPDATE_ELAPSED':
        return {
          ...state,
          elapsedSeconds: action.payload
        };
      case 'FINISH_SESSION':
        return {
          ...state,
          isSessionFinished: true,
          finalDuration: state.elapsedSeconds
        };
      case 'RESTORE_SESSION':
        return {
          ...state,
          ...action.payload
        };
      case 'RESET_SESSION':
        return initialSessionState;
      default:
        return state;
    }
  }
  
  // Friend status reducer
  export function friendStatusReducer(state: FriendState, action: FriendAction): FriendState {
    switch (action.type) {
      case 'ADD_FRIEND':
        return {
          ...state,
          [action.payload]: true
        };
      default:
        return state;
    }
  }
  
  // Dialog state reducer
  export function dialogReducer(state: DialogState, action: DialogAction): DialogState {
    switch (action.type) {
      case 'SHOW_CONFIRM':
        return {
          ...state,
          showConfirmDialog: true
        };
      case 'HIDE_CONFIRM':
        return {
          ...state,
          showConfirmDialog: false
        };
      case 'SHOW_WARNING':
        return {
          ...state,
          showWarningDialog: true
        };
      case 'HIDE_WARNING':
        return {
          ...state,
          showWarningDialog: false
        };
      default:
        return state;
    }
  }
  
  // Result selection reducer
  export function resultReducer(state: ResultState, action: ResultAction): ResultState {
    switch (action.type) {
      case 'SELECT_RESULT':
        return {
          ...state,
          selectedResult: action.payload
        };
      case 'SET_RATING':
        return {
          ...state,
          rating: action.payload
        };
      case 'SET_FEEDBACK':
        return {
          ...state,
          feedback: action.payload
        };
      default:
        return state;
    }
  }