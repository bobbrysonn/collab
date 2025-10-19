import { Logger } from '@hocuspocus/extension-logger';
import { SQLite } from '@hocuspocus/extension-sqlite';
import { Server } from '@hocuspocus/server';
import { slateNodesToInsertDelta } from '@slate-yjs/core';
import jwt from 'jsonwebtoken';
import * as Y from 'yjs';

const initialValue = [
  {
    type: 'paragraph',
    children: [{ text: '' }]
  }
];

const JWT_SECRET = process.env.JWT_SECRET || 'Pp66nozCv6cwh2LjRJhwEqaUaqlRHCvr';

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
    const { token, documentName } = data;

    if (!token) {
      throw new Error('Authentication required');
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.docId !== documentName) {
        throw new Error('Document ID mismatch');
      }

      const user = {
        id: decoded.sub,
        name: decoded.name || 'Unknown',
        role: decoded.role || 'Viewer',
        projectId: decoded.projectId,
        scriptId: decoded.scriptId
      };

      if (user.role === "Viewer") {
        data.connection.readOnly = true;
      }

      return { user };
    } catch (error) {
      console.error('Authentication failed:', error.message);
      throw new Error('Invalid token');
    }
  },

    async onDisconnect(data) {
    // The context is available here.
    const user = data.context?.user;
    console.log('User disconnected:', user);

    if (user) {
      const awareness = data.document.awareness;
      awareness.setLocalStateField('user', null);
    }
  },

  async onAwarenessUpdate(data) {
    const { document, context, added } = data;
    const user = context?.user;

    if (added.length > 0 && user) {
      console.log('✅ User joined and authenticated:', user);

      const awareness = document.awareness;
      awareness.setLocalStateField('user', {
        id: user.id,
        name: user.name,
        role: user.role,
        color: getUserColor(user.id)
      });
    }
  },

  async onRequest(data) {
    const { request, context } = data;
    const user = context.user;

    if (user.role === 'Viewer' && ['update', 'sync'].includes(request.type)) {
      throw new Error('Read-only user cannot modify document');
    }
  }
});

server.enableMessageLogging();
server.listen();

console.log(`Hocuspocus server running on ${process.env.HOST || '0.0.0.0'}:${process.env.PORT || 1234}`);

const colors = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
];

function getUserColor(userId) {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
