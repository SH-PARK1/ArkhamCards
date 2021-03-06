import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { flatMap, filter, forEach, keys, map, range, sortBy } from 'lodash';
import { t } from 'ttag';

import { CHAOS_TOKEN_ORDER, ChaosBag, ChaosTokenType } from '@app_constants';
import SealTokenButton from './SealTokenButton';
import { Toggles, useEffectUpdate, useToggles } from '@components/core/hooks';
import { CampaignId, ChaosBagResults, SealedToken } from '@actions/types';
import { useDialog } from '@components/deck/dialogs';
import { useDispatch } from 'react-redux';
import { updateChaosBagResults } from './actions';
import space from '@styles/space';

export interface SealTokenDialogProps {
  campaignId: CampaignId;
  chaosBag: ChaosBag;
}

function getSealedToggles(chaosBagResults: ChaosBagResults): Toggles {
  const toggles: Toggles = {};
  forEach(chaosBagResults.sealedTokens || [], token => {
    toggles[token.id] = true;
  });
  return toggles;
}

export default function useSealTokenDialog(campaignId: CampaignId, chaosBag: ChaosBag, chaosBagResults: ChaosBagResults): [React.ReactNode, () => void] {
  const [sealed, toggleSealToken,,syncToggles] = useToggles(getSealedToggles(chaosBagResults));
  const allTokens: SealedToken[] = useMemo(() => {
    const unsortedTokens: ChaosTokenType[] = keys(chaosBag) as ChaosTokenType[];
    const tokens: ChaosTokenType[] = sortBy<ChaosTokenType>(
      unsortedTokens,
      token => CHAOS_TOKEN_ORDER[token]
    );
    const blessTokens: ChaosTokenType[] = map(range(0, chaosBagResults.blessTokens || 0), () => 'bless');
    const curseTokens: ChaosTokenType[] = map(range(0, chaosBagResults.curseTokens || 0), () => 'curse');
    const tokenParts: ChaosTokenType[] = [
      ...flatMap(tokens, token => map(range(0, chaosBag[token]), () => token)),
      ...blessTokens,
      ...curseTokens,
    ];

    let currentToken: ChaosTokenType;
    let tokenCount = 1;

    return tokenParts.map(token => {
      if (currentToken !== token) {
        currentToken = token;
        tokenCount = 1;
      } else {
        tokenCount += 1;
      }

      const id = `${token}_${tokenCount}`;
      return {
        id,
        icon: token,
      };
    });
  }, [chaosBag, chaosBagResults.blessTokens, chaosBagResults.curseTokens]);

  useEffectUpdate(() => {
    syncToggles(getSealedToggles(chaosBagResults));
  }, [chaosBagResults]);

  const dispatch = useDispatch();
  const onConfirm = useCallback(() => {
    const newSealedTokens = filter(allTokens, t => {
      return !!sealed[t.id];
    });

    const newChaosBagResults: ChaosBagResults = {
      ...chaosBagResults,
      drawnTokens: chaosBagResults.drawnTokens,
      sealedTokens: newSealedTokens,
      totalDrawnTokens: chaosBagResults.totalDrawnTokens,
    };

    dispatch(updateChaosBagResults(campaignId, newChaosBagResults));
  }, [dispatch, campaignId, chaosBagResults, allTokens, sealed]);

  const content = useMemo(() => {
    return (
      <View style={[styles.drawnTokenRow, space.paddingBottomS]}>
        { map(allTokens, ({ id, icon }) => {
          return (
            <View style={space.paddingXs} key={id}>
              <SealTokenButton
                id={id}
                sealed={!!sealed[id]}
                onToggle={toggleSealToken}
                iconKey={icon}
              />
            </View>
          );
        }) }
      </View>
    );
  }, [allTokens, sealed, toggleSealToken]);
  const onCancel = useCallback(() => {
    syncToggles(getSealedToggles(chaosBagResults));
  }, [syncToggles, chaosBagResults]);
  const { dialog, showDialog } = useDialog({
    title: t`Seal tokens`,
    dismiss: {
      title: t`Cancel`,
      onPress: onCancel,
    },
    confirm: {
      title: t`Done`,
      onPress: onConfirm,
    },
    content,
    alignment: 'bottom',
  });
  return [dialog, showDialog];
}
const styles = StyleSheet.create({
  drawnTokenRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
  },
});
