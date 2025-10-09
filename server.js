import { Logger } from '@hocuspocus/extension-logger';
import { SQLite } from '@hocuspocus/extension-sqlite';
import { Server } from '@hocuspocus/server';
import { slateNodesToInsertDelta } from '@slate-yjs/core';
import * as Y from 'yjs';

const initialValue = [
  {
    type: 'paragraph',
    children: [{ text: '' }]
  }
];

const server = Server.configure({
  port: parseInt(process.env.PORT ?? '', 10) || 1234,
  address: process.env.HOST || '0.0.0.0',

  extensions: [
    new Logger(),
    new SQLite({
      database: './dbDir/db.sqlite',
    }),
  ],

  async onLoadDocument(data) {
    if (data.document.isEmpty('content')) {
      const insertDelta = slateNodesToInsertDelta(initialValue);
      const sharedRoot = data.document.get('content', Y.XmlText);
      sharedRoot.applyDelta(insertDelta);
    }

    return data.document;
  },

  async onAuthenticate(data) {
    const { token } = data;

    if (!token) {
      throw new Error('Authentication required');
    }

    return {
      user: {
        id: data.requestParameters.get('userId') || 'anonymous',
        name: data.requestParameters.get('userName') || 'Anonymous'
      }
    };
  }
});

server.enableMessageLogging();
server.listen();

console.log(`Hocuspocus server running on ${process.env.HOST || '0.0.0.0'}:${process.env.PORT || 1234}`);
