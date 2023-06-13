import { Dispatch } from "react";
import { checkPlayerFilter, isEquipCard, isPlayerAlive } from "./Filters";
import { Card, GameTable, Player, getCard, getPlayer } from "./GameTable";
import { GameChannel } from "./GameUpdateHandler";
import { TargetMode, TargetSelector, getCardEffects, getCurrentCardAndTargets, getEffectAt, isCardCurrent, isResponse, isValidCardTarget, isValidEquipTarget, isValidPlayerTarget, selectorCanPickCard, selectorCanPlayCard } from "./TargetSelector";
import { SelectorUpdate } from "./TargetSelectorReducer";
import { CardId } from "./GameUpdate";

export function handleClickCard(table: GameTable, selector: TargetSelector, selectorDispatch: Dispatch<SelectorUpdate>, card: Card) {
    switch (selector.mode) {
    case TargetMode.target:
    case TargetMode.modifier: {
        let cardTarget: Card | undefined;
        switch (card.pocket?.name) {
        case 'player_character':
            cardTarget = getCard(table, getPlayer(table, card.pocket.player).pockets.player_character[0]);
            break;
        case 'player_table':
        case 'player_hand':
        case 'selection':
            cardTarget = card;
            break;
        }
        if (cardTarget && isValidCardTarget(table, selector, cardTarget)) {
            selectorDispatch({ addCardTarget: cardTarget });
        }
        break;
    }
    case TargetMode.start: {
        const canPlay = selectorCanPlayCard(selector, card);
        if ('respond_cards' in selector.request) {
            const canPick = selectorCanPickCard(table, selector, card);
            if (canPlay && canPick) {
                selectorDispatch({ setPrompt: { playpickundo: card }});
            } else if (canPlay) {
                selectorDispatch({ selectPlayingCard: card });
            } else if (canPick) {
                selectorDispatch({ selectPickCard: card });
            }
        } else if (canPlay) {
            if (isEquipCard(card)) {
                selectorDispatch({ selectEquipCard: card });
            } else {
                selectorDispatch({ selectPlayingCard: card });
            }
        }
    }
    }
}

export function handleClickPlayer(table: GameTable, selector: TargetSelector, selectorDispatch: Dispatch<SelectorUpdate>, player: Player) {
    switch (selector.mode) {
    case TargetMode.target:
    case TargetMode.modifier:
        if (isValidPlayerTarget(table, selector, player)) {
            selectorDispatch({ addPlayerTarget: player });
        }
        break;
    case TargetMode.equip:
        if (isValidEquipTarget(table, selector, player)) {
            selectorDispatch({ addEquipTarget: player });
        }
    }
}

export function handleAutoSelect(table: GameTable, selector: TargetSelector, selectorDispatch: Dispatch<SelectorUpdate>) {
    const selectCard = (cardId: CardId) => {
        const card = getCard(table, cardId);
        if (!isCardCurrent(selector, card)) {
            selectorDispatch({ selectPlayingCard: card });
        }
    };
    if ('playing_card' in selector.selection) {
        if (selector.mode == TargetMode.start) {
            if (selector.selection.context.repeat_card) {
                selectCard(selector.selection.context.repeat_card);
            } else if (selector.selection.context.traincost) {
                selectCard(selector.selection.context.traincost);
            }
        } else if (selector.mode == TargetMode.target || selector.mode == TargetMode.modifier) {
            // TODO handle auto_confirm

            const [currentCard, targets] = getCurrentCardAndTargets(selector);
            const lastTarget = targets.at(-1);
            if (lastTarget) {
                if ('conditional_player' in lastTarget && lastTarget.conditional_player === null) {
                    const effect = getEffectAt(getCardEffects(currentCard, isResponse(selector)), targets.length - 1);
                    if (table.alive_players.some(target => checkPlayerFilter(table, selector, effect!.player_filter, getPlayer(table, target)))) {
                        selectorDispatch({ revertLastTarget: {} });
                    } else {
                        selectorDispatch({ reserveTargets: 0 });
                    }
                } else if ('cards_other_players' in lastTarget && lastTarget.cards_other_players.length == 0) {
                    const selection = selector.selection;
                    const numTargetable = table.alive_players.reduce((count, target) => {
                        if (target != table.self_player && target != selection.context.skipped_player) {
                            const player = getPlayer(table, target);
                            if (isPlayerAlive(player)) {
                                if (player.pockets.player_hand.length != 0) {
                                    return count + 1;
                                }
                                if (player.pockets.player_table.some(targetCard => {
                                    const card = getCard(table, targetCard);
                                    return 'color' in card.cardData && card.cardData.color != 'black';
                                })) {
                                    return count + 1;
                                }
                            }
                        }
                        return count;
                    }, 0);
                    selectorDispatch({ reserveTargets: numTargetable });
                }
            }
        }
    } else if (!('picked_card' in selector.selection)) {
        if ('auto_select' in selector.request && selector.request.auto_select) {
            if (selector.request.respond_cards.length == 1 && selector.request.pick_cards.length == 0) {
                selectCard(selector.request.respond_cards[0].card);
            }
        }
    }
}

export function handleSendGameAction(channel: GameChannel, selector: TargetSelector, bypass_prompt: boolean = true) {
    if (selector.mode == TargetMode.finish && (!('yesno' in selector.prompt) || bypass_prompt)) {
        if ('picked_card' in selector.selection) {
            const card = selector.selection.picked_card;
            channel.sendGameAction({ pick_card: { card, bypass_prompt }});
        } else if ('playing_card' in selector.selection && selector.selection.playing_card) {
            const card = selector.selection.playing_card.id;
            const modifiers = selector.selection.modifiers.map(({modifier, targets}) => ({ card: modifier.id, targets }));
            const targets = selector.selection.targets;
            channel.sendGameAction({ play_card: { card, modifiers, targets, bypass_prompt}});
        }
    }
}