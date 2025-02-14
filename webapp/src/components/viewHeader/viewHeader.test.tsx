// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {render} from '@testing-library/react'
import {Provider as ReduxProvider} from 'react-redux'

import '@testing-library/jest-dom'

import {TestBlockFactory} from '../../test/testBlockFactory'

import {wrapIntl, mockStateStore} from '../../testUtils'

import ViewHeader from './viewHeader'

const board = TestBlockFactory.createBoard()
const activeView = TestBlockFactory.createBoardView(board)
const card = TestBlockFactory.createCard(board)

describe('components/viewHeader/viewHeader', () => {
    const state = {
        users: {
            me: {
                id: 'user-id-1',
                username: 'username_1',
            },
        },
        searchText: {
        },
        boards: {
            current: board,
        },
        cards: {
            templates: [card],
        },
    }
    const store = mockStateStore([], state)
    test('return viewHeader', () => {
        const {container} = render(
            wrapIntl(
                <ReduxProvider store={store}>
                    <ViewHeader
                        board={board}
                        activeView={activeView}
                        views={[activeView]}
                        cards={[card]}
                        groupByProperty={board.fields.cardProperties[0]}
                        addCard={jest.fn()}
                        addCardFromTemplate={jest.fn()}
                        addCardTemplate={jest.fn()}
                        editCardTemplate={jest.fn()}
                        readonly={false}
                        showShared={false}
                    />
                </ReduxProvider>,
            ),
        )
        expect(container).toMatchSnapshot()
    })
    test('return viewHeader readonly', () => {
        const {container} = render(
            wrapIntl(
                <ReduxProvider store={store}>
                    <ViewHeader
                        board={board}
                        activeView={activeView}
                        views={[activeView]}
                        cards={[card]}
                        groupByProperty={board.fields.cardProperties[0]}
                        addCard={jest.fn()}
                        addCardFromTemplate={jest.fn()}
                        addCardTemplate={jest.fn()}
                        editCardTemplate={jest.fn()}
                        readonly={true}
                        showShared={false}
                    />
                </ReduxProvider>,
            ),
        )
        expect(container).toMatchSnapshot()
    })
})
