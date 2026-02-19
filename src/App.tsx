import { useEffect, useMemo, useState } from 'react'
import { Onboarding } from './components/Onboarding'
import { ArtistList } from './components/ArtistList'
import { ArtistDetail } from './components/ArtistDetail'
import { BottomTabBar } from './components/BottomTabBar'
import { ChatMain } from './components/ChatMain'
import { MoreTab } from './components/MoreTab'
import type { Artist, ChatThread } from './firebase/types'
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from './firebase/init'

function App() {
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null)
  const [userKey, setUserKey] = useState<number | null>(null)
  const [detailTab, setDetailTab] = useState<'info' | 'request' | 'review' | 'more'>('info')
  const [mainTab, setMainTab] = useState<'home' | 'chat' | 'more'>('home')
  const [mainTabDirection, setMainTabDirection] = useState<'forward' | 'backward'>('forward')
  const [isMainTabAnimating, setIsMainTabAnimating] = useState(false)
  const [tabDirection, setTabDirection] = useState<'forward' | 'backward'>('forward')
  const [isDetailClosing, setIsDetailClosing] = useState(false)
  const [isOnboardingClosing, setIsOnboardingClosing] = useState(false)
  const [clientChats, setClientChats] = useState<ChatThread[]>([])
  const [artistChats, setArtistChats] = useState<ChatThread[]>([])

  useEffect(() => {
    if (!userKey) {
      setClientChats([])
      setArtistChats([])
      return
    }

    const chatsRef = collection(db, 'chats')
    const clientQuery = query(chatsRef, where('clientUserKey', '==', userKey))

    const unsubscribeClient = onSnapshot(clientQuery, async (snapshot) => {
      const nextChats = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as ChatThread[]
      
      // dev__userKey 형식의 문의하기 채팅도 포함
      const supportChatId = `dev__${userKey}`
      const supportChatRef = doc(db, 'chats', supportChatId)
      const supportChatSnap = await getDoc(supportChatRef)
      if (supportChatSnap.exists()) {
        const supportChat = {
          id: supportChatSnap.id,
          ...supportChatSnap.data()
        } as ChatThread
        // 이미 목록에 없으면 추가
        if (!nextChats.find(chat => chat.id === supportChatId)) {
          nextChats.push(supportChat)
        }
      }
      
      setClientChats(nextChats)
    })

    const artistQuery = query(chatsRef, where('artistUserKey', '==', userKey))
    const unsubscribeArtist = onSnapshot(artistQuery, (snapshot) => {
      const nextChats = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as ChatThread[]
      setArtistChats(nextChats)
    })

    return () => {
      unsubscribeClient()
      unsubscribeArtist()
    }
  }, [userKey])

  const [viewedChatId, setViewedChatId] = useState<string | null>(null)

  useEffect(() => {
    if (mainTab !== 'chat') setViewedChatId(null)
  }, [mainTab])

  const unreadCount = useMemo(() => {
    if (!userKey) return 0
    const map = new Map<string, ChatThread>()
    ;[...clientChats, ...artistChats].forEach((chat) => {
      map.set(chat.id, chat)
    })
    let count = 0
    map.forEach((chat) => {
      // 현재 보고 있는 채팅방은 제외 (입장 시 알람 깜빡임 방지)
      if (chat.id === viewedChatId) return

      const lastMessageAt = chat.lastMessageAt?.toMillis?.() ?? 0
      // 메시지가 없는 채팅방은 제외
      if (lastMessageAt === 0) return

      // 내가 보낸 메시지나 시스템 메시지는 알람 제외
      const myRole = chat.clientUserKey === userKey ? 'client' : 'artist'
      const lastSenderRole = chat.lastMessageSenderRole
      if (lastSenderRole === myRole || lastSenderRole === 'system') return

      let lastReadAt = 0
      if (chat.clientUserKey === userKey) {
        lastReadAt = chat.clientLastReadAt?.toMillis?.() ?? 0
      } else if (chat.artistUserKey && chat.artistUserKey === userKey) {
        lastReadAt = chat.artistLastReadAt?.toMillis?.() ?? 0
      }
      // 상대방의 읽지 않은 메시지가 있는 경우만 카운트
      if (lastMessageAt > lastReadAt) {
        count += 1
      }
    })
    return count
  }, [clientChats, artistChats, userKey, viewedChatId])

  const chatIcon = unreadCount > 0 ? 'icon-chat-bubble-red' : 'icon-chat-bubble-grey'

  const handleLoginComplete = (key: number) => {
    setUserKey(key);
    setIsOnboardingClosing(true);
    window.setTimeout(() => {
      setShowOnboarding(false);
      setIsOnboardingClosing(false);
    }, 250);
  };

  if (showOnboarding) {
    return <Onboarding onComplete={handleLoginComplete} isClosing={isOnboardingClosing} />
  }

  const handleSelectArtist = (artist: Artist) => {
    setDetailTab('info')
    setTabDirection('forward')
    setIsDetailClosing(false)
    setSelectedArtist(artist)
  }

  const tabOrder: Record<'info' | 'request' | 'review' | 'more', number> = {
    info: 0,
    request: 1,
    review: 2,
    more: 3,
  }

  const mainTabOrder: Record<'home' | 'chat' | 'more', number> = {
    home: 0,
    chat: 1,
    more: 2,
  }

  const handleTabChange = (nextTab: 'info' | 'request' | 'review' | 'more') => {
    if (nextTab === detailTab) return
    const nextDirection = tabOrder[nextTab] >= tabOrder[detailTab] ? 'forward' : 'backward'
    setTabDirection(nextDirection)
    setDetailTab(nextTab)
  }

  const handleCloseDetail = () => {
    setIsDetailClosing(true)
    window.setTimeout(() => {
      setSelectedArtist(null)
      setIsDetailClosing(false)
    }, 250)
  }

  const handleMainTabChange = (nextTab: 'home' | 'chat' | 'more') => {
    if (nextTab === mainTab) return
    const nextDirection = mainTabOrder[nextTab] >= mainTabOrder[mainTab] ? 'forward' : 'backward'
    setMainTabDirection(nextDirection)
    setMainTab(nextTab)
    setIsMainTabAnimating(true)
    window.setTimeout(() => setIsMainTabAnimating(false), 250)
  }

  const handleChatStart = (chatId: string) => {
    // 채팅 탭으로 전환
    if (mainTab !== 'chat') {
      setMainTabDirection('forward')
      setMainTab('chat')
      setIsMainTabAnimating(true)
      window.setTimeout(() => setIsMainTabAnimating(false), 250)
    }
    // ChatMain에서 채팅 시작 (채팅 탭 전환 애니메이션 완료 후)
    setTimeout(() => {
      if ((window as any).__startChat) {
        (window as any).__startChat(chatId)
      }
    }, 300)
  }

  const isDetail = !!selectedArtist

  return (
    <>
      {isDetail ? (
        <ArtistDetail
          artist={selectedArtist!}
          userKey={userKey}
          onClose={handleCloseDetail}
          onTabChange={handleTabChange}
          activeTab={detailTab}
          tabDirection={tabDirection}
          isClosing={isDetailClosing}
          onChatStart={handleChatStart}
        />
      ) : (
        <div
          className={
            isMainTabAnimating
              ? `main-tab-content ${mainTabDirection === 'forward' ? 'main-slide-forward' : 'main-slide-backward'}`
              : 'main-tab-content'
          }
        >
          {mainTab === 'home' ? (
            <ArtistList 
              onViewArtist={handleSelectArtist}
              userKey={userKey}
              onChatStart={handleChatStart}
            />
          ) : mainTab === 'chat' ? (
            <ChatMain
              userKey={userKey}
              onChatStart={handleChatStart}
              onViewedChatChange={setViewedChatId}
            />
          ) : (
            <MoreTab userKey={userKey} onOpenSupportChat={handleChatStart} />
          )}
        </div>
      )}
      <BottomTabBar
        activeKey={isDetail ? detailTab : mainTab}
        onChange={isDetail ? (key) => handleTabChange(key as 'info' | 'request' | 'review' | 'more') : (key) => handleMainTabChange(key as 'home' | 'chat' | 'more')}
        onBack={isDetail ? handleCloseDetail : undefined}
        visible={true}
        variant={isDetail ? 'floating' : 'docked'}
        transitionDirection={isDetail ? tabDirection : mainTabDirection}
        isClosing={isDetail ? isDetailClosing : false}
        animateLift={false}
        tabs={isDetail
          ? [
              { key: 'info', label: '정보', icon: 'icon-user-mono' },
              { key: 'request', label: '신청', icon: 'icon-document-check-lines-mono' },
              { key: 'review', label: '리뷰', icon: 'icon-star-mono' },
              { key: 'more', label: '더보기', icon: 'icon-dots-color' },
            ]
          : [
              { key: 'home', label: '홈', icon: 'icon-user-mono' },
              { key: 'chat', label: '채팅', icon: chatIcon, badgeCount: unreadCount },
              { key: 'more', label: '더보기', icon: 'icon-line-three-dots-mono' },
            ]
        }
      />
    </>
  )
}

export default App
