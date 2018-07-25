import React from 'react';
import PropTypes from 'prop-types';
import { filter, find, flatMap, forEach, head, keys, map, range, shuffle } from 'lodash';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { CachedImage, ImageCacheManager } from 'react-native-cached-image';
import FlipCard from 'react-native-flip-card';

import withWeaknessCards from './withWeaknessCards';
import Button from '../core/Button';
import ChooserButton from '../core/ChooserButton';
import { CARD_RATIO } from '../../styles/sizes';
import typography from '../../styles/typography';
const PLAYER_BACK = require('../../assets/player-back.png');
const defaultImageCacheManager = ImageCacheManager();

const PADDING = 32;

class WeaknessDrawComponent extends React.Component {
  static propTypes = {
    navigator: PropTypes.object.isRequired,
    weaknessSet: PropTypes.object,
    updateDrawnCard: PropTypes.func.isRequired,
    customHeader: PropTypes.node,
    saving: PropTypes.bool,
    // From realm, actually an 'array'.
    cards: PropTypes.object,
  };

  constructor(props) {
    super(props);

    const {
      width,
    } = Dimensions.get('window');

    const cardWidth = width - PADDING * 2;
    const cardHeight = Math.round(cardWidth * CARD_RATIO);

    this.state = {
      headerHeight: 32,
      cardWidth,
      cardHeight,
      selectedTraits: [],
      nextCard: this.nextCard([]),
      flipped: false,
      drawNewCard: false,
    };

    this._onHeaderLayout = this.onHeaderLayout.bind(this);
    this._drawAnother = this.drawAnother.bind(this);
    this._flipCard = this.flipCard.bind(this);
    this._onFlipEnd = this.onFlipEnd.bind(this);
    this._onTraitsChange = this.onTraitsChange.bind(this);
    this._selectNextCard = this.selectNextCard.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (this.props.weaknessSet !== prevProps.weaknessSet && !this.state.flipped) {
      /* eslint-disable react/no-did-update-set-state */
      this.setState({
        nextCard: this.nextCard(this.state.selectedTraits),
      });
    }
  }

  onHeaderLayout(event) {
    this.setState({
      headerHeight: event.nativeEvent.layout.height,
    });
  }

  drawAnother() {
    this.setState({
      flipped: false,
      drawNewCard: true,
    });
  }

  flipCard() {
    if (!this.state.flipped && !this.state.drawNewCard) {
      const {
        updateDrawnCard,
        weaknessSet: {
          assignedCards,
        },
      } = this.props;
      const {
        nextCard,
      } = this.state;

      const newAssignedCards = Object.assign({}, assignedCards);
      if (!newAssignedCards[nextCard.code]) {
        newAssignedCards[nextCard.code] = 0;
      }
      newAssignedCards[nextCard.code]++;

      this.setState({
        flipped: true,
      }, () => {
        updateDrawnCard(nextCard.code, newAssignedCards);
      });
    }
  }

  onTraitsChange(values) {
    this.setState({
      selectedTraits: values,
    }, this._selectNextCard);
  }

  onFlipEnd() {
    if (this.state.drawNewCard) {
      setTimeout(this._selectNextCard, 200);
    }
  }

  selectNextCard() {
    this.setState({
      drawNewCard: false,
      nextCard: this.nextCard(this.state.selectedTraits),
    });
  }

  nextCard(selectedTraits) {
    const {
      weaknessSet: {
        assignedCards,
      },
    } = this.props;
    const cards = shuffle(flatMap(this.selectedCards(selectedTraits), card => {
      return map(
        range(0, card.quantity - (assignedCards[card.code] || 0)),
        () => card);
    }));

    const card = head(cards);
    if (card && card.imagesrc) {
      defaultImageCacheManager.downloadAndCacheUrl(`https://arkhamdb.com/${card.imagesrc}`);
    }
    return card;
  }

  selectedCards(selectedTraits) {
    if (!selectedTraits.length) {
      return this.cards();
    }
    return filter(this.cards(), card => {
      return !!find(selectedTraits, trait =>
        card.traits_normalized.indexOf(`#${trait.toLowerCase()}#`) !== -1);
    });
  }

  cards() {
    const {
      weaknessSet: {
        packCodes,
        assignedCards,
      },
      cards,
    } = this.props;
    const packSet = new Set(packCodes);
    return filter(cards, card => (
      packSet.has(card.pack_code) &&
      (assignedCards[card.code] || 0) < card.quantity
    ));
  }

  allTraits() {
    const {
      selectedTraits,
    } = this.state;
    const traitsMap = {};
    forEach(this.cards(), card => {
      if (card.traits) {
        forEach(
          filter(map(card.traits.split('.'), t => t.trim()), t => t),
          t => {
            traitsMap[t] = 1;
          });
      }
    });
    forEach(selectedTraits, trait => {
      traitsMap[trait] = 1;
    });
    return keys(traitsMap).sort();
  }

  renderHeaderContent() {
    const {
      navigator,
      customHeader,
      saving,
    } = this.props;
    const {
      selectedTraits,
      flipped,
      headerHeight,
    } = this.state;
    if (saving) {
      return (
        <View style={[styles.buttonWrapper, { height: headerHeight }]}>
          <Text style={typography.text}>Saving</Text>
          <ActivityIndicator
            style={[{ height: 80 }]}
            size="small"
            animating
          />
        </View>
      );
    }
    if (flipped) {
      return (
        <View style={[styles.buttonWrapper, { height: headerHeight }]}>
          <Button text="Draw another" onPress={this._drawAnother} />
        </View>
      );
    }
    return (
      <View onLayout={this._onHeaderLayout}>
        { customHeader }
        <ChooserButton
          navigator={navigator}
          title="Traits"
          values={this.allTraits()}
          selection={selectedTraits}
          onChange={this._onTraitsChange}
        />
      </View>
    );
  }

  renderCard() {
    const {
      selectedTraits,
      nextCard,
      flipped,
      cardWidth,
      cardHeight,
    } = this.state;
    if (nextCard) {
      return (
        <View style={styles.cardWrapper}>
          <TouchableWithoutFeedback onPress={this._flipCard}>
            <FlipCard
              style={[styles.flipCard, {
                width: cardWidth,
                height: cardHeight,
              }]}
              friction={6}
              perspective={1000}
              flipHorizontal
              flipVertical={false}
              flip={flipped}
              clickable={false}
              onFlipEnd={this._onFlipEnd}
            >
              <CachedImage
                style={styles.verticalCardImage}
                source={PLAYER_BACK}
                resizeMode="contain"
              />
              { nextCard && (
                <CachedImage
                  style={styles.verticalCardImage}
                  source={{
                    uri: `https://arkhamdb.com/${nextCard.imagesrc}`,
                  }}
                  resizeMode="contain"
                />
              ) }
            </FlipCard>
          </TouchableWithoutFeedback>
        </View>
      );
    }
    if (selectedTraits.length) {
      return (
        <Text style={[typography.text, styles.errorText]}>
          No Matching Weaknesses, try adjusting Trait filter.
        </Text>
      );
    }
    return (
      <Text style={[typography.text, styles.errorText]}>
        All weaknesses have been drawn.
      </Text>
    );
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          { this.renderHeaderContent() }
        </View>
        { this.renderCard() }
      </View>
    );
  }
}

export default withWeaknessCards(WeaknessDrawComponent);

const styles = StyleSheet.create({
  container: {
    height: '100%',
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headerContainer: {
    flexDirection: 'column',
    width: '100%',
  },
  buttonWrapper: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 8,
  },
  verticalCardImage: {
    width: '100%',
    height: '100%',
  },
  cardWrapper: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipCard: {
    borderWidth: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  errorText: {
    marginTop: 8,
  },
});