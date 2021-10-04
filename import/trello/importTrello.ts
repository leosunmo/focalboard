// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import * as fs from 'fs'
import minimist from 'minimist'
import * as readline from 'readline'
import {exit} from 'process'
import {ArchiveUtils} from '../../webapp/src/blocks/archive'
import {Block} from '../../webapp/src/blocks/block'
import {IPropertyOption, IPropertyTemplate, createBoard} from '../../webapp/src/blocks/board'
import {createBoardView} from '../../webapp/src/blocks/boardView'
import {createCard} from '../../webapp/src/blocks/card'
import {createTextBlock} from '../../webapp/src/blocks/textBlock'
import {createCheckboxBlock} from '../../webapp/src/blocks/checkboxBlock'
import { Trello} from './trello'
import {Utils} from './utils'

// HACKHACK: To allow Utils.CreateGuid to work
(global.window as any) = {}

const optionColors = [
    // 'propColorDefault',
    'propColorGray',
    'propColorBrown',
    'propColorOrange',
    'propColorYellow',
    'propColorGreen',
    'propColorBlue',
    'propColorPurple',
    'propColorPink',
    'propColorRed',
]
let optionColorIndex = 0

async function main() {
    const args: minimist.ParsedArgs = minimist(process.argv.slice(2))

    const inputFile = args['i']
    const outputFile = args['o'] || 'archive.focalboard'
    const appKey = args['k']

    if (!inputFile) {
        showHelp()
    }

    if (!fs.existsSync(inputFile)) {
        console.error(`File not found: ${inputFile}`)
        exit(2)
    }

    // Authenticate to Trello
    let authToken = ""
    if (appKey) {
        const trelloAuthURL = "https://trello.com/1/connect?key=" + 
    appKey +
    "&name=trello-export&response_type=token&scope=account,read&expiration=5m"

        console.log(`Follow link to get Token: ${trelloAuthURL}`)

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        })

        const query =  new Promise<string>(resolve => {
            rl.question('Once you have the token, paste it here: ', (token) => {
                resolve(token)
            })
        })
    
        authToken = await query
    }
    // Read input
    const inputData = fs.readFileSync(inputFile, 'utf-8')
    const input = JSON.parse(inputData) as Trello

    // Convert
    const blocks = convert(input, authToken, appKey)

    // Save output
    // TODO: Stream output
    const outputData = ArchiveUtils.buildBlockArchive(blocks)
    fs.writeFileSync(outputFile, outputData)

    console.log(`Exported to ${outputFile}`)
}

function getAttachment(url: string, token: string, appKey: string) {
    console.log(`${url}${token}${appKey}`)
// Pull down image/attachment
// TODO: do we save them to disk for manual import? That doesn't seem nice.
// TODO: do we somehow import them directly to Focalboard? There's nowhere for the images to go in the import archive.
}

function convert(input: Trello, token: string, appKey: string): Block[] {
    const blocks: Block[] = []

    // Board
    const board = createBoard()
    console.log(`Board: ${input.name}`)
    board.rootId = board.id
    board.title = input.name
    board.fields.description = input.desc

    // Convert lists (columns) to a Select property
    const optionIdMap = new Map<string, string>()
    const options: IPropertyOption[] = []
    input.lists.forEach(list => {
        const optionId = Utils.createGuid()
        optionIdMap.set(list.id, optionId)
        const color = optionColors[optionColorIndex % optionColors.length]
        optionColorIndex += 1
        const option: IPropertyOption = {
            id: optionId,
            value: list.name,
            color,
        }
        options.push(option)
    })

    const cardProperty: IPropertyTemplate = {
        id: Utils.createGuid(),
        name: 'List',
        type: 'select',
        options
    }
    board.fields.cardProperties = [cardProperty]
    blocks.push(board)

    // Board view
    const view = createBoardView()
    view.title = 'Board View'
    view.fields.viewType = 'board'
    view.rootId = board.id
    view.parentId = board.id
    blocks.push(view)

    // Cards
    input.cards.forEach(card => {
        console.log(`Card: ${card.name}`)

        const outCard = createCard()
        outCard.title = card.name
        outCard.rootId = board.id
        outCard.parentId = board.id

        // Map lists to Select property options
        if (card.idList) {
            const optionId = optionIdMap.get(card.idList)
            if (optionId) {
                outCard.fields.properties[cardProperty.id] = optionId
            } else {
                console.warn(`Invalid idList: ${card.idList} for card: ${card.name}`)
            }
        } else {
            console.warn(`Missing idList for card: ${card.name}`)
        }

        blocks.push(outCard)

        if (card.desc) {
            // console.log(`\t${card.desc}`)
            const text = createTextBlock()
            text.title = card.desc
            text.rootId = board.id
            text.parentId = outCard.id
            blocks.push(text)

            outCard.fields.contentOrder = [text.id]
        }

        // Add Checklists
        if (card.idChecklists && card.idChecklists.length) {
            card.idChecklists.forEach(checklistID => {
                const lookup = input.checklists.find(e => e.id === checklistID)
                if (lookup !== undefined) {
                    lookup.checkItems.forEach(trelloCheckBox=> {
                        const checkBlock = createCheckboxBlock()
                        checkBlock.title = trelloCheckBox.name
                        if (trelloCheckBox.state == 'complete') {
                            checkBlock.fields.value = true
                        } else {
                            checkBlock.fields.value = false
                        }
                        checkBlock.rootId = outCard.rootId
                        checkBlock.parentId = outCard.id
                        blocks.push(checkBlock)

                        outCard.fields.contentOrder.push(checkBlock.id)
                    })
                }
            })
        }

        // Add attachments
        if (token !== "" && appKey !== "") {
            if (card.attachments && card.attachments.length) {
                card.attachments.forEach(attachment => {
                    getAttachment(attachment.url,token,appKey)
                })
            }
        }


    })

    console.log('')
    console.log(`Found ${input.cards.length} card(s).`)

    return blocks
}

function showHelp() {
    console.log('import -i <input.json> -o [output.focalboard] [-k trello-app-key]')
    exit(1)
}

main()
