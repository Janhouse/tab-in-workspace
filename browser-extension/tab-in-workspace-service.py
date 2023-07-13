#!/usr/bin/python3
# Native Messaging service for "Browser tabs in active Workspace/desktop" extension.

import sys
import json
import struct

from gi.repository import GLib
from pydbus import SessionBus
from pydbus.generic import signal

def getMessage():
  rawLength = sys.stdin.buffer.read(4)
  if len(rawLength) == 0:
    sys.exit(0)
  messageLength = struct.unpack('@I', rawLength)[0]
  message = sys.stdin.buffer.read(messageLength).decode('utf-8')
  return json.loads(message)

def encodeBrowserMessage(messageContent):
  encodedContent = json.dumps(messageContent).encode('utf-8')
  encodedLength = struct.pack('@I', len(encodedContent))
  return {'length': encodedLength, 'content': encodedContent}

def sendMessageToBrowser(encodedMessage):
  sys.stdout.buffer.write(encodedMessage['length'])
  sys.stdout.buffer.write(encodedMessage['content'])
  sys.stdout.buffer.flush()

def handleBrowserMessages(channel, sender=None):
  global emit
  message = getMessage()
  if 'action' not in message:
    return False  
  match message['action']:
      case "windowsAdded":
        wIds = message['windowIds']
        emit.windowsAdded(wIds)
  return True

class BrowserHandler(object):
  """
    <node>
      <interface name='lv.janhouse.TabInWorkspace.Browser'>
        <method name='openUrl'>
          <arg type='t' name='windowId' direction='in'/>
          <arg type='s' name='url' direction='in'/>
        </method>
        <method name='idLinked'>
          <arg type='t' name='windowId' direction='in'/>
        </method>
        <signal name='windowsAdded'>
          <arg type='at' name='windowIds' direction='out' />
        </signal>
      </interface>
    </node>
  """

  windowsAdded = signal()

  def openUrl(self, windowId, url):
    message = {
      'action': 'openUrl',
      'windowId': str(windowId),
      'url': url
    }
    sendMessageToBrowser(encodeBrowserMessage(message))

  def idLinked(self, windowId):
    message = {
      'action': 'idLinked',
      'windowId': str(windowId)
    }
    sendMessageToBrowser(encodeBrowserMessage(message))

#sys.stdin = sys.stdin.detach()
#sys.stdout = sys.stdout.detach()
loop = GLib.MainLoop()
channel = GLib.IOChannel.unix_new(sys.stdin.fileno())
GLib.io_add_watch(channel, GLib.IOCondition.IN, handleBrowserMessages)
GLib.io_add_watch(channel, GLib.IOCondition.HUP, lambda *_: loop.quit())
bus = SessionBus()
global emit
emit = BrowserHandler()
pub = bus.publish('lv.janhouse.TabInWorkspace.Browser', emit)

loop.run()
