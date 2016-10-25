// @flow
import { Map } from 'immutable';

export const ApiEvents = {
  INITIALIZE_GAME: 'INITIALIZE_GAME',
  GET_PLAYER_BASE_DATA: 'GET_PLAYER_BASE_DATA',
  GET_PROFILE_DATA: 'GET_PROFILE_DATA',
  GET_FURNITURE: 'GET_FURNITURE',
  GET_BASE_DATA: 'GET_BASE_DATA',
  GET_MATERIAL: 'GET_MATERIAL',
  GET_USABLE_ITEMS: 'GET_USABLE_ITEMS',
  GET_FLEET_DATA: 'GET_FLEET_DATA',
  GET_FLEET: 'GET_FLEET',
  GET_SLOT_ITEMS: 'GET_SLOT_ITEMS',
  USE_ITEM: 'USE_ITEM',
  DESTROY_ITEM: 'DESTROY_ITEM',
  LOCK_EQUIPMENT: 'LOCK_EQUIPMENT',
  START_REPAIR: 'START_REPAIR',
  GET_CONSTRUCTION_DOCKS: 'GET_CONSTRUCTION_DOCKS',
  GET_SHIP: 'GET_SHIP',
  CRAFT_SHIP: 'CRAFT_SHIP',
  CHANGE_SHIP: 'CHANGE_SHIP',
  RESUPPLY_SHIP: 'RESUPPLY_SHIP',
  DESTROY_SHIP: 'DESTROY_SHIP',
  REMODEL_SHIP: 'REMODEL_SHIP',
  MODERNIZE_SHIP: 'MODERNIZE_SHIP',
  CRAFT_ITEM: 'CRAFT_ITEM',
  FLEET_COMBINED: 'FLEET_COMBINED',
  COMBINED_BATTLE_WATER_PHASE: 'COMBINED_BATTLE_WATER_PHASE',
  LOAD_FLEET_PRESET: 'LOAD_FLEET_PRESET',
  GET_QUEST_LIST: 'GET_QUEST_LIST',
  START_QUEST: 'START_QUEST',
  STOP_QUEST: 'STOP_QUEST',
  COMPLETE_QUEST: 'COMPLETE_QUEST',
  GET_MISSION_LIST: 'GET_MISSION_LIST',
  START_MISSION: 'START_MISSION',
  QUIT_MISSION: 'QUIT_MISSION',
  COMPLETE_MISSION: 'COMPLETE_MISSION',
  GET_OPPONENT_INFO: 'GET_OPPONENT_INFO',
  GET_PVP_OPPONENT_LIST: 'GET_PVP_OPPONENT_LIST',
  START_PVP_BATTLE: 'START_PVP_BATTLE',
  START_PVP_NIGHT_BATTLE: 'START_PVP_NIGHT_BATTLE',
  FINISHED_PRACTICE: 'FINISHED_PRACTICE',
  START_SORTIE: 'START_SORTIE',
  NEXT_SORTIE_NODE: 'NEXT_SORTIE_NODE',
  SORTIE_STAGE: 'SORTIE_STAGE',
  FINISHED_SORTIE: 'FINISHED_SORTIE',
  GET_SORTIE_CONDITIONS: 'GET_SORTIE_CONDITIONS',
  USE_PAID_ITEM: 'USE_PAID_ITEM'
};

export const ApiEventPaths = Map({
  // region # Core game-related
  [ApiEvents.INITIALIZE_GAME]: '/api_start2',
  [ApiEvents.GET_PLAYER_BASE_DATA]: '/api_get_member/require_info',
  [ApiEvents.GET_BASE_DATA]: '/api_port/port',
  [ApiEvents.GET_FLEET]: '/api_get_member/ship_deck',
  [ApiEvents.GET_FLEET_DATA]: '/api_get_member/deck',
  [ApiEvents.GET_MATERIAL]: '/api_get_member/material',
  [ApiEvents.GET_SLOT_ITEMS]: '/api_get_member/slotitem',
  [ApiEvents.FLEET_COMBINED]: '/api_req_hensei/combined',
  [ApiEvents.LOAD_FLEET_PRESET]: '/api_req_hensei/preset_select',
  [ApiEvents.RESUPPLY_SHIP]: '/api_req_hokyu/charge',
  // endregion
  // region # Dock-related
  [ApiEvents.START_REPAIR]: '/api_req_nyukyo/start',
  // endregion
  // region # Sortie-related
  [ApiEvents.START_SORTIE]: '/api_req_map/start',
  [ApiEvents.GET_SORTIE_CONDITIONS]: '/api_get_member/sortie_conditions',
  [ApiEvents.NEXT_SORTIE_NODE]: '/api_req_map/next',
  [ApiEvents.SORTIE_STAGE]: '/api_req_sortie/battle',
  [ApiEvents.COMBINED_BATTLE_WATER_PHASE]: '/api_req_combined_battle/battle_water',
  [ApiEvents.FINISHED_SORTIE]: '/api_req_sortie/battleresult',
  // endregion
  // region # Practice-related
  [ApiEvents.GET_PVP_OPPONENT_LIST]: '/api_get_member/practice',
  [ApiEvents.GET_OPPONENT_INFO]: '/api_req_member/get_practice_enemyinfo',
  [ApiEvents.START_PVP_BATTLE]: '/api_req_practice/battle',
  [ApiEvents.START_PVP_NIGHT_BATTLE]: '/api_req_practice/midnight_battle',
  [ApiEvents.FINISHED_PRACTICE]: '/api_req_practice/battle_result',
  // endregion
  // region # Mission-related
  [ApiEvents.GET_MISSION_LIST]: '/api_get_member/mission',
  [ApiEvents.START_MISSION]: '/api_req_mission/start',
  [ApiEvents.COMPLETE_MISSION]: '/api_req_mission/result',
  [ApiEvents.QUIT_MISSION]: '/api_req_mission/return_instruction',
  // endregion
  // region # Construction-related
  [ApiEvents.GET_CONSTRUCTION_DOCKS]: '/api_get_member/kdock',
  [ApiEvents.CRAFT_ITEM]: '/api_req_kousyou/createitem',
  [ApiEvents.DESTROY_ITEM]: '/api_req_kousyou/destroyitem2',
  [ApiEvents.CRAFT_SHIP]: '/api_req_kousyou/createship',
  [ApiEvents.DESTROY_SHIP]: '/api_req_kousyou/destroyship',
  [ApiEvents.GET_SHIP]: '/api_req_kousyou/getship',
  // endregion
  // region # Quest-related
  [ApiEvents.GET_QUEST_LIST]: '/api_get_member/questlist',
  [ApiEvents.START_QUEST]: '/api_req_quest/start',
  [ApiEvents.STOP_QUEST]: '/api_req_quest/stop',
  [ApiEvents.COMPLETE_QUEST]: '/api_req_quest/clearitemget'
  // endregion
});

export const ApplicationEvents = {
  REGISTER_GAME_VIEW: 'REGISTER_GAME_VIEW'
};

export const Network = {
  REQUEST_WILL_BE_SENT: 'Network.requestWillBeSent',
  RESPONSE_RECEIVED: 'Network.responseReceived',
  LOADING_FINISHED: 'Network.loadingFinished',
  DETACH: 'Network.detach',
  ENABLE: 'Network.enable',
  DISABLE: 'Network.disable',
  GET_RESPONSE_BODY: 'Network.getResponseBody'
};
