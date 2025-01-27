'use strict'
import { v4 as uuid } from 'uuid'
import { CancellationToken, Disposable, DocumentSelector, Location, LocationLink, Position } from 'vscode-languageserver-protocol'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { DeclarationProvider } from './index'
import Manager from './manager'
const logger = require('../util/logger')('definitionManager')

export default class DeclarationManager extends Manager<DeclarationProvider> {

  public register(selector: DocumentSelector, provider: DeclarationProvider): Disposable {
    return this.addProvider({
      id: uuid(),
      selector,
      provider
    })
  }

  public async provideDeclaration(
    document: TextDocument,
    position: Position,
    token: CancellationToken
  ): Promise<Location[] | null> {
    const providers = this.getProviders(document)
    let locations: Location[] = []
    const results = await Promise.allSettled(providers.map(item => {
      return Promise.resolve(item.provider.provideDeclaration(document, position, token)).then(location => {
        this.addLocation(locations, location)
      })
    }))
    this.handleResults(results, 'provideDeclaration')
    return locations
  }
}
