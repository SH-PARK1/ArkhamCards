import { find, forEach, map } from 'lodash';

import {
  LOGOUT,
  NEW_CAMPAIGN,
  UPDATE_CAMPAIGN,
  DELETE_CAMPAIGN,
  ADD_CAMPAIGN_SCENARIO_RESULT,
  EDIT_CAMPAIGN_SCENARIO_RESULT,
  SET_ALL_CAMPAIGNS,
  REPLACE_LOCAL_DECK,
  Campaign,
  CampaignActions,
} from '../actions/types';

export interface CampaignsState {
  all: {
    [id: string]: Campaign;
  };
}

const DEFAULT_CAMPAIGNS_STATE: CampaignsState = {
  all: {},
};

export default function(
  state: CampaignsState = DEFAULT_CAMPAIGNS_STATE,
  action: CampaignActions
): CampaignsState {
  if (action.type === LOGOUT) {
    return DEFAULT_CAMPAIGNS_STATE;
  }
  if (action.type === SET_ALL_CAMPAIGNS) {
    const all: { [id: string]: Campaign } = {};
    forEach(action.campaigns, campaign => {
      all[campaign.id] = campaign;
    });
    return {
      all,
    };
  }
  if (action.type === DELETE_CAMPAIGN) {
    const newCampaigns = Object.assign({}, state.all);
    delete newCampaigns[action.id];
    return Object.assign({},
      state,
      { all: newCampaigns },
    );
  }
  if (action.type === NEW_CAMPAIGN) {
    const campaignNotes = {
      sections: map(action.campaignLog.sections || [], section => {
        return { title: section, notes: [] };
      }),
      counts: map(action.campaignLog.counts || [], section => {
        return { title: section, count: 0 };
      }),
      investigatorNotes: {
        sections: map(action.campaignLog.investigatorSections || [], section => {
          return { title: section, notes: {} };
        }),
        counts: map(action.campaignLog.investigatorCounts || [], section => {
          return { title: section, counts: {} };
        }),
      },
    };

    const newCampaign = {
      id: action.id,
      name: action.name,
      showInterludes: true,
      cycleCode: action.cycleCode,
      difficulty: action.difficulty,
      chaosBag: Object.assign({}, action.chaosBag),
      campaignNotes,
      weaknessSet: action.weaknessSet,
      baseDeckIds: action.baseDeckIds,
      lastUpdated: action.now,
      investigatorData: {},
      scenarioResults: [],
    };
    return Object.assign({},
      state,
      { all: Object.assign({}, state.all, { [action.id]: newCampaign }) },
    );
  }
  if (action.type === UPDATE_CAMPAIGN) {
    const campaign: Campaign = Object.assign(
      {},
      state.all[action.id],
      action.campaign,
      { lastUpdated: action.now }
    );
    return Object.assign({},
      state,
      { all: Object.assign({}, state.all, { [action.id]: campaign }) },
    );
  }
  if (action.type === REPLACE_LOCAL_DECK) {
    const all = Object.assign(
      {},
      state.all
    );
    forEach(all, (campaign, campaignId) => {
      if (find(campaign.baseDeckIds || [], deckId => deckId === action.localId)) {
        all[campaignId] = Object.assign({},
          campaign,
          {
            baseDeckIds: map(campaign.baseDeckIds, deckId => {
              if (deckId === action.localId) {
                return action.deck.id;
              }
              return deckId;
            }),
          }
        );
      }
    });
    return Object.assign({},
      state,
      { all },
    );
  }
  if (action.type === EDIT_CAMPAIGN_SCENARIO_RESULT) {
    const campaign = { ...state.all[action.id] };
    const scenarioResults = [
      ...campaign.scenarioResults || [],
    ];
    scenarioResults[action.index] = { ...action.scenarioResult };
    const updatedCampaign = {
      ...campaign,
      scenarioResults,
      lastUpdated: action.now,
    };
    return {
      ...state,
      all: { ...state.all, [action.id]: updatedCampaign },
    };
  }
  if (action.type === ADD_CAMPAIGN_SCENARIO_RESULT) {
    const campaign = { ...state.all[action.id] };
    const scenarioResults = [
      ...campaign.scenarioResults || [],
      { ...action.scenarioResult },
    ];
    const updatedCampaign = {
      ...campaign,
      scenarioResults,
      lastUpdated: action.now,
    };
    if (action.campaignNotes) {
      updatedCampaign.campaignNotes = action.campaignNotes;
    }
    return {
      ...state,
      all: { ...state.all, [action.id]: updatedCampaign },
    };
  }
  return state;
}
