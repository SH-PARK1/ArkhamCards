import { StyleContextType } from '@styles/StyleContext';
import React from 'react';
import {
  Text,
} from 'react-native';
import { Node, OutputFunction, RenderState } from 'react-native-markdown-view';

import { WithChildren } from './types';

export default function BoldHtmlTagNode({ fontScale, typography }: StyleContextType) {
  return (
    node: Node & WithChildren,
    output: OutputFunction,
    state: RenderState
  ) => {
    return (
      <Text key={state.key} style={[
        {
          fontFamily: 'Alegreya-Regular',
          fontSize: 16 * fontScale,
          lineHeight: 20 * fontScale,
        },
        typography.bold,
      ]}>
        { output(node.children, state) }
      </Text>
    );
  };
}
