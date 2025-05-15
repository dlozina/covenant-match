"use client";

import Image from "next/image";
import { MainLayout } from "@/components/layout";
import { ScrollText, Info, AlertCircle, Users, MessageSquare, UserCircle2, ZoomIn, X, UserMinus, BarChart3, Play, Flag, CheckCircle, UserPlus, BookOpen, ArrowRight, ArrowUp, LogIn, Globe, Monitor, AlertTriangle, LayoutList } from "lucide-react";
import { useState } from "react";
import { Footer } from "@/components/layout/Footer";
export default function DocsPage() {
  // State for image modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalAlt, setModalAlt] = useState("");

  // Function to open modal with image
  const openImageModal = (src: string, alt: string) => {
    setModalImage(src);
    setModalAlt(alt);
    setModalOpen(true);
    // Prevent scrolling when modal is open
    document.body.style.overflow = "hidden";
  };

  // Function to close modal
  const closeImageModal = () => {
    setModalOpen(false);
    // Restore scrolling
    document.body.style.overflow = "auto";
  };

  return (
    <MainLayout footer={<Footer />}>
      <div className="space-y-8">
        {/* Page header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-shadow-sm">
            Documentation
          </h1>
          <p className="text-muted-foreground">
            Learn how to use Covenant Match to find the perfect teammates for your gaming sessions.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="gothic-card-no-hover p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl font-semibold">Table of Contents</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a href="#creating-session" className="group flex items-center p-3 rounded-md border border-purple-900/20 bg-card/50 hover:bg-card/80 transition-colors">
              <div className="flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-purple-400" />
                <span className="font-medium">Creating a New Session</span>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <a href="#managing-session" className="group flex items-center p-3 rounded-md border border-purple-900/20 bg-card/50 hover:bg-card/80 transition-colors">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-400" />
                <span className="font-medium">Managing Your Session</span>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <a href="#active-session" className="group flex items-center p-3 rounded-md border border-purple-900/20 bg-card/50 hover:bg-card/80 transition-colors">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-purple-400" />
                <span className="font-medium">Active Session</span>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <a href="#reporting-results" className="group flex items-center p-3 rounded-md border border-purple-900/20 bg-card/50 hover:bg-card/80 transition-colors">
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-purple-400" />
                <span className="font-medium">Reporting Session Results</span>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <a href="#managing-players" className="group flex items-center p-3 rounded-md border border-purple-900/20 bg-card/50 hover:bg-card/80 transition-colors">
              <div className="flex items-center gap-2">
                <UserMinus className="h-5 w-5 text-purple-400" />
                <span className="font-medium">Managing Players</span>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <a href="#player-statistics" className="group flex items-center p-3 rounded-md border border-purple-900/20 bg-card/50 hover:bg-card/80 transition-colors">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-400" />
                <span className="font-medium">Viewing Player Statistics</span>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>

            <a href="#dashboard" className="group flex items-center p-3 rounded-md border border-purple-900/20 bg-card/50 hover:bg-card/80 transition-colors">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-400" />
                <span className="font-medium">Your Game Dashboard</span>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>

            <a href="#your-sessions" className="group flex items-center p-3 rounded-md border border-purple-900/20 bg-card/50 hover:bg-card/80 transition-colors">
              <div className="flex items-center gap-2">
                <LayoutList className="h-5 w-5 text-purple-400" />
                <span className="font-medium">Your Sessions</span>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            
            <a href="#session-limitations" className="group flex items-center p-3 rounded-md border border-purple-900/20 bg-card/50 hover:bg-card/80 transition-colors">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-purple-400" />
                <span className="font-medium">Session Limitations</span>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>

        {/* Docs section divider */}
        <div className="divider"></div>

        {/* Create New Session Section */}
        <section id="creating-session" className="space-y-6 scroll-mt-20">
          <h2 className="section-title flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-purple-400" />
            Creating a New Session
          </h2>

          <div className="gothic-card-no-hover p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative w-full overflow-hidden rounded-lg border border-purple-900/30 group cursor-pointer" 
                onClick={() => openImageModal("/create_session.png", "Create New Session interface")}
                role="button"
                tabIndex={0}
                aria-label="Open image in fullscreen"
                onKeyDown={(e) => e.key === 'Enter' && openImageModal("/create_session.png", "Create New Session interface")}
              >
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="flex items-center gap-2 text-white">
                    <ZoomIn className="h-5 w-5" />
                    <span>Click to zoom</span>
                  </div>
                </div>
                <Image 
                  src="/create_session.png"
                  alt="Create New Session interface showing session details, password field, and character selection"
                  width={900}
                  height={700}
                  priority
                  className="w-full h-auto object-contain"
                  sizes="(max-width: 640px) 95vw, (max-width: 768px) 90vw, (max-width: 1024px) 80vw, 900px"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Create New Session interface (click to enlarge)
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Info className="h-5 w-5 text-purple-400" />
                Session Details
              </h3>
              
              <div className="space-y-4 pl-3 sm:pl-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Session Name</h4>
                  <p className="text-muted-foreground">
                    Enter a descriptive name for your session. This will be displayed in the session list
                    on the covenant match page, making it easier for other players to find your session.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">In-Game Password</h4>
                  <p className="text-muted-foreground">
                    Create a unique password that your team will need to configure on their
                    gaming platform. This ensures only invited players can join your session.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Session Type</h4>
                  <p className="text-muted-foreground">
                    Choose whether your session is regular (visible to all players) or private
                    (only visible to invited friends).
                  </p>
                </div>
              </div>

              <h3 className="text-xl font-semibold flex items-center gap-2">
                <UserCircle2 className="h-5 w-5 text-purple-400" />
                Character Selection
              </h3>
              
              <div className="space-y-4 pl-3 sm:pl-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Select Nightfarer</h4>
                  <p className="text-muted-foreground">
                    Choose your Nightfarer character which will be displayed to other players.
                    Each character has unique abilities and playstyles.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Select Night Lord</h4>
                  <p className="text-muted-foreground">
                    Choose which Night Lord you want to session with your team. This will be
                    displayed on the session details for other players to see.
                  </p>
                </div>
              </div>

              <h3 className="text-xl font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-purple-400" />
                Creating Your Session
              </h3>
              
              <div className="space-y-2 pl-3 sm:pl-6">
                <p className="text-muted-foreground">
                  After filling in all the details, click the &ldquo;Create Session&rdquo; button. Your session
                  will be created and you will be redirected to your session screen where you can:
                </p>
                <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                  <li>Invite friends to join</li>
                  <li>Track session progress</li>
                  <li>Chat with team members</li>
                  <li>Modify session settings</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <a href="#" className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors">
              <ArrowUp className="h-3 w-3" />
              <span>Move to Top</span>
            </a>
          </div>
        </section>

        {/* Docs section divider */}
        <div className="divider"></div>

        {/* Session Created Section */}
        <section id="managing-session" className="space-y-6 scroll-mt-20">
          <h2 className="section-title flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-400" />
            Managing Your Session
          </h2>

          <div className="gothic-card-no-hover p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative w-full overflow-hidden rounded-lg border border-purple-900/30 group cursor-pointer"
                onClick={() => openImageModal("/session_created_1.png", "Session management interface")}
                role="button"
                tabIndex={0}
                aria-label="Open image in fullscreen"
                onKeyDown={(e) => e.key === 'Enter' && openImageModal("/session_created_1.png", "Session management interface")}
              >
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="flex items-center gap-2 text-white">
                    <ZoomIn className="h-5 w-5" />
                    <span>Click to zoom</span>
                  </div>
                </div>
                {/* Use a static img tag for components with loading issues */}
                <div className="relative w-full pt-[75%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/session_created_1.png"
                    alt="Session interface showing players list, session information and chat functionality"
                    className="absolute top-0 left-0 w-full h-full object-contain"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Session management interface (click to enlarge)
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                Session Overview
              </h3>
              
              <div className="space-y-4 pl-3 sm:pl-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Players Panel</h4>
                  <p className="text-muted-foreground">
                    The left panel shows all players in your session. As the host, you can see who has joined,
                    their character selection, and their ready status. Empty slots show as &ldquo;Not Joined&rdquo; until
                    players fill them.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Session Information</h4>
                  <p className="text-muted-foreground">
                    The right panel displays key session details including:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>In-Game Password - needed by all players to join</li>
                    <li>Night Lord - the boss your team will session</li>
                    <li>Session creator information</li>
                    <li>Share Session Link button to invite others</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Session Chat</h4>
                  <p className="text-muted-foreground">
                    The built-in chat system at the bottom lets you communicate with other players in your session.
                    Use this to coordinate strategies, discuss game plans, or just get to know your teammates
                    before starting the session.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Session Controls</h4>
                  <p className="text-muted-foreground">
                    As the host, you have access to several controls:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li><span className="text-purple-300">Start Session</span> - Begin the session once enough players have joined</li>
                    <li><span className="text-purple-300">Finish Session</span> - End a session after completion</li>
                    <li><span className="text-purple-300">Cancel Session</span> - Terminate the session before it begins</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    Note that you need a minimum of 3 players to start a session, as indicated by the player counter.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <a href="#" className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors">
              <ArrowUp className="h-3 w-3" />
              <span>Move to Top</span>
            </a>
          </div>
        </section>

        {/* Docs section divider */}
        <div className="divider"></div>

        {/* Active Session Section */}
        <section id="active-session" className="space-y-6 scroll-mt-20">
          <h2 className="section-title flex items-center gap-2">
            <Play className="h-5 w-5 text-purple-400" />
            Active Session
          </h2>

          <div className="gothic-card-no-hover p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative w-full overflow-hidden rounded-lg border border-purple-900/30 group cursor-pointer"
                onClick={() => openImageModal("/session_started.png", "Active session interface")}
                role="button"
                tabIndex={0}
                aria-label="Open image in fullscreen"
                onKeyDown={(e) => e.key === 'Enter' && openImageModal("/session_started.png", "Active session interface")}
              >
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="flex items-center gap-2 text-white">
                    <ZoomIn className="h-5 w-5" />
                    <span>Click to zoom</span>
                  </div>
                </div>
                {/* Use a static img tag for components with loading issues */}
                <div className="relative w-full pt-[75%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/session_started.png"
                    alt="Active session interface showing running status and player states"
                    className="absolute top-0 left-0 w-full h-full object-contain"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Active session interface (click to enlarge)
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Play className="h-5 w-5 text-purple-400" />
                During an Active session
              </h3>
              
              <div className="space-y-4 pl-3 sm:pl-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Session Started State</h4>
                  <p className="text-muted-foreground">
                    When a session is active, you&apos;ll notice several changes in the interface:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>The status indicator at the top shows &ldquo;InProgress&rdquo;</li>
                    <li>Each player&apos;s status changes from &ldquo;Ready&rdquo; to &ldquo;Running&rdquo;</li>
                    <li>The &ldquo;Start Session&rdquo; button is replaced with &ldquo;Session Started&rdquo; indicator</li>
                    <li>Only the &ldquo;Finish Session&rdquo; option remains available</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Session Information Updates</h4>
                  <p className="text-muted-foreground">
                    The session information panel updates to provide guidance on what happens next:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>Instructions for reporting results when the session ends</li>
                    <li>Information about continuing with the same team after completion</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    This information helps you understand the next steps in the session lifecycle
                    and ensures you know how to properly conclude your session.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Communication During the session</h4>
                  <p className="text-muted-foreground">
                    During an active session, the chat system becomes even more important:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>Coordinate your session strategy with team members</li>
                    <li>Share information about boss locations and attack patterns</li>
                    <li>Notify others if you need to take a break or encounter issues</li>
                    <li>Build camaraderie with your team through the shared experience</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Finishing the Session</h4>
                  <p className="text-muted-foreground">
                    When your session is complete, the host should:
                  </p>
                  <ol className="list-decimal pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>Let the team know in chat that they&apos;re finishing the session</li>
                    <li>Click the &ldquo;Finish Session&rdquo; button</li>
                    <li>Confirm the action in the dialog that appears</li>
                    <li>Proceed to report the results of your session</li>
                  </ol>
                  <p className="text-muted-foreground mt-2">
                    Only the host can finish a session. Players will receive a notification when
                    the session is ended and will be prompted to report their perspective on the results.
                  </p>
                </div>
                
                <div className="space-y-2 mt-4">
                  <h4 className="font-medium text-purple-300">Confirmation Dialog</h4>
                  <div className="flex flex-col items-center mb-4">
                    <div className="relative w-full max-w-lg mx-auto overflow-hidden rounded-lg border border-purple-900/30 group cursor-pointer"
                      onClick={() => openImageModal("/session_finish_session.png", "Session finish confirmation dialog")}
                      role="button"
                      tabIndex={0}
                      aria-label="Open image in fullscreen"
                      onKeyDown={(e) => e.key === 'Enter' && openImageModal("/session_finish_session.png", "Session finish confirmation dialog")}
                    >
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <div className="flex items-center gap-2 text-white">
                          <ZoomIn className="h-5 w-5" />
                          <span>Click to zoom</span>
                        </div>
                      </div>
                      {/* Use a static img tag for components with loading issues */}
                      <div className="relative w-full pt-[45%]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src="/session_finish_session.png"
                          alt="Confirmation dialog for finishing a session"
                          className="absolute top-0 left-0 w-full h-full object-contain"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Session finish confirmation dialog
                    </p>
                  </div>
                  <p className="text-muted-foreground">
                    When you click the &ldquo;Finish Session&rdquo; button, you&apos;ll be prompted with a confirmation dialog:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>The dialog reminds you that you&apos;ll need to report results after finishing</li>
                    <li>You can choose &ldquo;Yes, Finish Session&rdquo; to confirm</li>
                    <li>You can select &ldquo;Cancel&rdquo; if you clicked the button by mistake</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    This confirmation step helps prevent accidental session endings and ensures everyone
                    is ready to move to the reporting phase.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <a href="#" className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors">
              <ArrowUp className="h-3 w-3" />
              <span>Move to Top</span>
            </a>
          </div>
        </section>

        {/* Docs section divider */}
        <div className="divider"></div>

        {/* Report Results Section */}
        <section id="reporting-results" className="space-y-6 scroll-mt-20">
          <h2 className="section-title flex items-center gap-2">
            <Flag className="h-5 w-5 text-purple-400" />
            Reporting Session Results
          </h2>

          <div className="gothic-card-no-hover p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative w-full overflow-hidden rounded-lg border border-purple-900/30 group cursor-pointer"
                onClick={() => openImageModal("/session_report_result.png", "Session report result interface")}
                role="button"
                tabIndex={0}
                aria-label="Open image in fullscreen"
                onKeyDown={(e) => e.key === 'Enter' && openImageModal("/session_report_result.png", "Session report result interface")}
              >
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="flex items-center gap-2 text-white">
                    <ZoomIn className="h-5 w-5" />
                    <span>Click to zoom</span>
                  </div>
                </div>
                {/* Use a static img tag for components with loading issues */}
                <div className="relative w-full pt-[75%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/session_report_result.png"
                    alt="Interface showing how to report session results"
                    className="absolute top-0 left-0 w-full h-full object-contain"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Session result reporting interface (click to enlarge)
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Flag className="h-5 w-5 text-purple-400" />
                Submitting session Results
              </h3>
              
              <div className="space-y-4 pl-3 sm:pl-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">After Session Completion</h4>
                  <p className="text-muted-foreground">
                    When a session is completed, the interface changes to allow all players to report the outcome.
                    You&apos;ll notice:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>The status indicator at the top shows &ldquo;Completed&rdquo;</li>
                    <li>All players show &ldquo;Finished&rdquo; status</li>
                    <li>The result reporting panel appears on the right side</li>
                    <li>Each player must report their results individually (&ldquo;Result Pending&rdquo; indicators)</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Reporting Options</h4>
                  <p className="text-muted-foreground">
                    The result reporting interface provides three outcome options:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li><span className="text-emerald-400">WIN</span> - Your team successfully defeated the Night Lord</li>
                    <li><span className="text-muted-foreground">LOSS</span> - Your team was defeated by the Night Lord</li>
                    <li><span className="text-muted-foreground">D/C</span> - Disconnected (use only if technical issues prevented completion)</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    Select the outcome that best represents what happened during your session. 
                    Be honest with your reporting to maintain accurate statistics.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Session Rating</h4>
                  <p className="text-muted-foreground">
                    After selecting an outcome, you can rate your experience with the team:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>Rating is done on a 1-5 star scale</li>
                    <li>Consider factors like teamwork, communication, and overall enjoyment</li>
                    <li>Your ratings help improve matchmaking quality for future sessions</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Submitting Your Report</h4>
                  <p className="text-muted-foreground">
                    Once you&apos;ve selected an outcome and rating:
                  </p>
                  <ol className="list-decimal pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>Click the &ldquo;Submit Results&rdquo; button</li>
                    <li>Your status will change from &ldquo;Result Pending&rdquo; to &ldquo;Reported&rdquo;</li>
                    <li>Wait for other team members to submit their reports</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center">
              <div className="relative w-full overflow-hidden rounded-lg border border-purple-900/30 group cursor-pointer"
                onClick={() => openImageModal("/session_result_reported.png", "Results submitted interface")}
                role="button"
                tabIndex={0}
                aria-label="Open image in fullscreen"
                onKeyDown={(e) => e.key === 'Enter' && openImageModal("/session_result_reported.png", "Results submitted interface")}
              >
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="flex items-center gap-2 text-white">
                    <ZoomIn className="h-5 w-5" />
                    <span>Click to zoom</span>
                  </div>
                </div>
                {/* Use a static img tag for components with loading issues */}
                <div className="relative w-full pt-[75%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/session_result_reported.png"
                    alt="Interface showing results have been submitted"
                    className="absolute top-0 left-0 w-full h-full object-contain"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Results submitted confirmation (click to enlarge)
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-purple-400" />
                After Reporting
              </h3>
              
              <div className="space-y-4 pl-3 sm:pl-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Results Confirmation</h4>
                  <p className="text-muted-foreground">
                    After submitting your results:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>The reporting panel changes to a confirmation message</li>
                    <li>You&apos;ll see a &ldquo;Results Submitted&rdquo; notification</li>
                    <li>Your player status shows &ldquo;Reported&rdquo; instead of &ldquo;Result Pending&rdquo;</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Session Statistics</h4>
                  <p className="text-muted-foreground">
                    Once the majority of players have reported their results:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>The session outcome is determined by consensus</li>
                    <li>Results are saved in your player statistics</li>
                    <li>Your win/loss record and win rate percentage are updated</li>
                    <li>Session history is recorded in your profile</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Starting a New Session</h4>
                  <p className="text-muted-foreground">
                    After reporting, you have several options:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li><span className="text-purple-300">Create New Session With Same Team</span> - Start a fresh session with the current players</li>
                    <li><span className="text-purple-300">Back to Sessions</span> - Return to the sessions list to browse other games</li>
                    <li><span className="text-purple-300">Create New Session</span> - Start a completely new session with different settings</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    If you enjoyed playing with your team, consider using the &ldquo;Create New Session With Same Team&rdquo; option
                    for a seamless transition to another session. Keep in mind that this option will be available only if all players have reported their results.
                  </p>
                </div>

                <div className="space-y-2 mt-4">
                  <h4 className="font-medium text-purple-300 flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-purple-400" />
                    Adding Friends From Your Session
                  </h4>
                  <div className="flex flex-col items-center mb-4">
                    <div className="relative w-full max-w-lg mx-auto overflow-hidden rounded-lg border border-purple-900/30 group cursor-pointer"
                      onClick={() => openImageModal("/session_add_friend.png", "Add friend interface in completed session")}
                      role="button"
                      tabIndex={0}
                      aria-label="Open image in fullscreen"
                      onKeyDown={(e) => e.key === 'Enter' && openImageModal("/session_add_friend.png", "Add friend interface in completed session")}
                    >
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <div className="flex items-center gap-2 text-white">
                          <ZoomIn className="h-5 w-5" />
                          <span>Click to zoom</span>
                        </div>
                      </div>
                      {/* Use a static img tag for components with loading issues */}
                      <div className="relative w-full pt-[50%]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src="/session_add_friend.png"
                          alt="Interface showing how to add friends from your session"
                          className="absolute top-0 left-0 w-full h-full object-contain"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Add friend interface in a completed session
                    </p>
                  </div>
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-purple-300">One of the most important features</span> becomes available after a session is completed:
                    the ability to add players from your session to your friends list.
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>Look for the <span className="font-semibold">&ldquo;Add Friend&rdquo;</span> button that appears next to players&apos; names</li>
                    <li>Click the button to send them a friend request</li>
                    <li>Once accepted, these players will appear in your friends list for easier future collaboration</li>
                    <li>You can only send friend requests to players who aren&apos;t already your friends</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    This feature is crucial for building a network of skilled players that you enjoy gaming with.
                    After completing a session, take a moment to add players who were good teammates,
                    communicated well, or whose playstyle complemented yours.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <a href="#" className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors">
              <ArrowUp className="h-3 w-3" />
              <span>Move to Top</span>
            </a>
          </div>
        </section>

        {/* Docs section divider */}
        <div className="divider"></div>

        {/* Player Management Section */}
        <section id="managing-players" className="space-y-6 scroll-mt-20">
          <h2 className="section-title flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-purple-400" />
            Managing Players
          </h2>

          <div className="gothic-card-no-hover p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative w-full overflow-hidden rounded-lg border border-purple-900/30 group cursor-pointer"
                onClick={() => openImageModal("/session_kick_player.png", "Session kick player interface")}
                role="button"
                tabIndex={0}
                aria-label="Open image in fullscreen"
                onKeyDown={(e) => e.key === 'Enter' && openImageModal("/session_kick_player.png", "Session kick player interface")}
              >
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="flex items-center gap-2 text-white">
                    <ZoomIn className="h-5 w-5" />
                    <span>Click to zoom</span>
                  </div>
                </div>
                {/* Use a static img tag for components with loading issues */}
                <div className="relative w-full pt-[75%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/session_kick_player.png"
                    alt="Interface showing how to kick a player from a session"
                    className="absolute top-0 left-0 w-full h-full object-contain"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Player management interface (click to enlarge)
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <UserMinus className="h-5 w-5 text-purple-400" />
                Removing Players from Your Session
              </h3>
              
              <div className="space-y-4 pl-3 sm:pl-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">When to Remove Players</h4>
                  <p className="text-muted-foreground">
                    As a session host, you have the power to remove players from your session. This may be necessary when:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>A player is inactive or AFK (away from keyboard)</li>
                    <li>Someone is being disruptive in the chat</li>
                    <li>You need to make room for a friend to join</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">How to Kick a Player</h4>
                  <p className="text-muted-foreground">
                    To remove a player from your session:
                  </p>
                  <ol className="list-decimal pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>Locate the player in the Players panel</li>
                    <li>Look for the &ldquo;Kick player from session&rdquo; button (red X) that appears when you hover over or click on a player</li>
                    <li>Click the button to remove them</li>
                    <li>Confirm your decision when prompted</li>
                  </ol>
                  <p className="text-muted-foreground mt-2">
                    The player will receive a notification that they have been removed from the session, 
                    and their slot will become available for another player to join.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Player Management Best Practices</h4>
                  <p className="text-muted-foreground">
                    To maintain a positive gaming community:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>Send a message in chat before kicking someone, explaining why</li>
                    <li>Give players a chance to respond before removing them for inactivity</li>
                    <li>Remember that kicked players won&apos;t be able to rejoin your session unless you share a new invitation with them</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <a href="#" className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors">
              <ArrowUp className="h-3 w-3" />
              <span>Move to Top</span>
            </a>
          </div>
        </section>

        {/* Docs section divider */}
        <div className="divider"></div>

        {/* Player Stats Section */}
        <section id="player-statistics" className="space-y-6 scroll-mt-20">
          <h2 className="section-title flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-400" />
            Viewing Player Statistics
          </h2>

          <div className="gothic-card-no-hover p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative w-full overflow-hidden rounded-lg border border-purple-900/30 group cursor-pointer"
                onClick={() => openImageModal("/session_player_stats.png", "Player statistics interface")}
                role="button"
                tabIndex={0}
                aria-label="Open image in fullscreen"
                onKeyDown={(e) => e.key === 'Enter' && openImageModal("/session_player_stats.png", "Player statistics interface")}
              >
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="flex items-center gap-2 text-white">
                    <ZoomIn className="h-5 w-5" />
                    <span>Click to zoom</span>
                  </div>
                </div>
                {/* Use a static img tag for components with loading issues */}
                <div className="relative w-full pt-[75%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/session_player_stats.png"
                    alt="Interface showing player statistics and performance data"
                    className="absolute top-0 left-0 w-full h-full object-contain"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Player statistics interface (click to enlarge)
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-400" />
                Understanding Player Performance
              </h3>
              
              <div className="space-y-4 pl-3 sm:pl-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Player Profile Access</h4>
                  <p className="text-muted-foreground">
                    During a session, you can view detailed statistics for any player by clicking on their name or avatar
                    in the Players panel. This opens a statistics overlay showing their performance history and current status.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Stats Overview</h4>
                  <p className="text-muted-foreground">
                    The player statistics card displays important information:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li><span className="text-purple-300">Covenant Affiliation</span> - Which faction the player belongs to</li>
                    <li><span className="text-purple-300">Experience Level</span> - Indicated by labels like &ldquo;Veteran&rdquo;</li>
                    <li><span className="text-purple-300">Games Played</span> - Total number of sessions completed</li>
                    <li><span className="text-purple-300">Win/Loss Record</span> - The player&apos;s success ratio</li>
                    <li><span className="text-purple-300">Win Rate (WR)</span> - Percentage of games won with progress bar</li>
                    <li><span className="text-purple-300">Score</span> - Overall performance rating in the game</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Using Stats Effectively</h4>
                  <p className="text-muted-foreground">
                    Player statistics can help you:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>Identify experienced players who might take leadership roles</li>
                    <li>Balance your team by including players with different skill levels</li>
                    <li>Build trust with new players by showing your own experience</li>
                    <li>Recognize skilled players you might want to add as friends for future sessions</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    Remember that statistics are just one part of the player experience. They don&apos;t always reflect 
                    a player&apos;s ability to communicate well or work as part of a team.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <a href="#" className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors">
              <ArrowUp className="h-3 w-3" />
              <span>Move to Top</span>
            </a>
          </div>
        </section>

        {/* Docs section divider */}
        <div className="divider"></div>

        {/* Dashboard Section */}
        <section id="dashboard" className="space-y-6 scroll-mt-20">
          <h2 className="section-title flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-400" />
            Your Game Dashboard
          </h2>

          <div className="gothic-card-no-hover p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative w-full overflow-hidden rounded-lg border border-purple-900/30 group cursor-pointer"
                onClick={() => openImageModal("/dashboard.png", "Player dashboard interface")}
                role="button"
                tabIndex={0}
                aria-label="Open image in fullscreen"
                onKeyDown={(e) => e.key === 'Enter' && openImageModal("/dashboard.png", "Player dashboard interface")}
              >
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="flex items-center gap-2 text-white">
                    <ZoomIn className="h-5 w-5" />
                    <span>Click to zoom</span>
                  </div>
                </div>
                {/* Use a static img tag for components with loading issues */}
                <div className="relative w-full pt-[75%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/dashboard.png"
                    alt="Dashboard showing overall statistics, Nightfarer and Night Lord performance"
                    className="absolute top-0 left-0 w-full h-full object-contain"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Player dashboard interface (click to enlarge)
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-400" />
                Dashboard Overview
              </h3>
              
              <div className="space-y-4 pl-3 sm:pl-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Personal Dashboard</h4>
                  <p className="text-muted-foreground">
                    Your personal dashboard provides a comprehensive overview of your gaming performance.
                    It&apos;s designed to help you track your progress, analyze your strengths, and identify areas
                    for improvement. The dashboard is accessible from the main navigation menu.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Overall Statistics</h4>
                  <p className="text-muted-foreground">
                    The top section of your dashboard displays your overall game statistics:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li><span className="text-purple-300">Total Games</span> - The number of completed sessions you&apos;ve participated in</li>
                    <li><span className="text-green-500">Wins</span> - Your successful sessions</li>
                    <li><span className="text-red-500">Losses</span> - Sessions that ended in defeat</li>
                    <li><span className="text-yellow-500">Disconnects</span> - Sessions where you or others experienced technical issues</li>
                    <li><span className="text-blue-500">Win Rate</span> - Your winning percentage across all games</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Character Performance</h4>
                  <p className="text-muted-foreground">
                    The dashboard features detailed performance statistics for your characters:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li><span className="text-purple-300">Nightfarer Stats</span> - Shows performance data for your Nightfarer characters</li>
                    <li><span className="text-purple-300">Night Lord Stats</span> - Displays your record when playing as Night Lords</li>
                    <li>Both sections include games played and win rates with visual indicators</li>
                    <li>Drop-down menus allow you to view stats for specific characters</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    The circular graphs represent your win rates visually, making it easy to identify which
                    characters you perform best with. This information can help you make informed decisions
                    when selecting characters for future sessions.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center">
              <div className="relative w-full overflow-hidden rounded-lg border border-purple-900/30 group cursor-pointer"
                onClick={() => openImageModal("/dashboard_session_history.png", "Session history interface")}
                role="button"
                tabIndex={0}
                aria-label="Open image in fullscreen"
                onKeyDown={(e) => e.key === 'Enter' && openImageModal("/dashboard_session_history.png", "Session history interface")}
              >
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="flex items-center gap-2 text-white">
                    <ZoomIn className="h-5 w-5" />
                    <span>Click to zoom</span>
                  </div>
                </div>
                {/* Use a static img tag for components with loading issues */}
                <div className="relative w-full pt-[50%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/dashboard_session_history.png"
                    alt="Dashboard session history showing recent game results"
                    className="absolute top-0 left-0 w-full h-full object-contain"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Session history interface (click to enlarge)
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-purple-400" />
                Recent Session History
              </h3>
              
              <div className="space-y-4 pl-3 sm:pl-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Session Log</h4>
                  <p className="text-muted-foreground">
                    Below your performance statistics, you&apos;ll find a detailed log of your recent gaming sessions:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>Each row represents a completed session</li>
                    <li>Information includes the session name, Night Lord, Nightfarer character, result, and timestamp</li>
                    <li>Results are color-coded: <span className="text-green-500">Wins</span> in green, <span className="text-red-500">Losses</span> in red, <span className="text-yellow-500">Disconnects</span> in yellow</li>
                    <li>The time column shows how recently the session took place</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Filtering Options</h4>
                  <p className="text-muted-foreground">
                    The session history includes powerful filtering capabilities:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li><span className="text-purple-300">Night Lord Filter</span> - View sessions with specific Night Lords</li>
                    <li><span className="text-purple-300">Nightfarer Filter</span> - Filter by the Nightfarer character used</li>
                    <li><span className="text-purple-300">Result Filter</span> - Show only wins, losses, or disconnects</li>
                    <li><span className="text-purple-300">Reset Filters</span> - Clear all filters to view your complete history</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    These filters help you analyze trends in your gameplay. For example, you might discover
                    that you have a higher win rate against certain Night Lords or when using specific Nightfarer characters.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center">
              <div className="relative w-full overflow-hidden rounded-lg border border-purple-900/30 group cursor-pointer"
                onClick={() => openImageModal("/dashboard_session_details.png", "Session details interface")}
                role="button"
                tabIndex={0}
                aria-label="Open image in fullscreen"
                onKeyDown={(e) => e.key === 'Enter' && openImageModal("/dashboard_session_details.png", "Session details interface")}
              >
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="flex items-center gap-2 text-white">
                    <ZoomIn className="h-5 w-5" />
                    <span>Click to zoom</span>
                  </div>
                </div>
                {/* Use a static img tag for components with loading issues */}
                <div className="relative w-full pt-[50%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/dashboard_session_details.png"
                    alt="Dashboard session details showing player information and results"
                    className="absolute top-0 left-0 w-full h-full object-contain"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Session details interface (click to enlarge)
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Info className="h-5 w-5 text-purple-400" />
                Session Details
              </h3>
              
              <div className="space-y-4 pl-3 sm:pl-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Reviewing Session Details</h4>
                  <p className="text-muted-foreground">
                    Clicking on the details icon for any session reveals a comprehensive overview of that specific game:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li><span className="text-purple-300">Session ID</span> - The unique identifier for the session</li>
                    <li><span className="text-purple-300">Night Lord</span> - Which boss your team faced</li>
                    <li><span className="text-purple-300">Status</span> - Whether the session was completed, canceled, or in progress</li>
                    <li><span className="text-purple-300">Time</span> - When the session took place</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Player Information</h4>
                  <p className="text-muted-foreground">
                    The session details window shows information about all players who participated:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>Player usernames</li>
                    <li>Each player&apos;s chosen Nightfarer character</li>
                    <li>Individual results (which may differ if players disconnected)</li>
                    <li>Friend status indicators for players on your friends list</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    This detailed view helps you remember who you played with and how the session went.
                    It&apos;s also a great way to identify players you might want to add as friends if you
                    haven&apos;t already.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Using Session History Effectively</h4>
                  <p className="text-muted-foreground">
                    Your session history can be a powerful tool for improvement:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>Identify patterns in your wins and losses</li>
                    <li>Track your performance with different characters</li>
                    <li>Find players you&apos;ve had successful sessions with</li>
                    <li>Monitor your progress over time</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    Regular review of your dashboard can help you make better decisions about character
                    selection, team composition, and skill development, ultimately leading to more
                    enjoyable and successful gaming sessions.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <a href="#" className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors">
              <ArrowUp className="h-3 w-3" />
              <span>Move to Top</span>
            </a>
          </div>
        </section>

        {/* Your Sessions Section */}
        <section id="your-sessions" className="space-y-6 scroll-mt-20">
          <h2 className="section-title flex items-center gap-2">
            <LayoutList className="h-5 w-5 text-purple-400" />
            Your Sessions
          </h2>

          <div className="gothic-card-no-hover p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative w-full overflow-hidden rounded-lg border border-purple-900/30 group cursor-pointer"
                onClick={() => openImageModal("/your_session_screeen.png", "Your Sessions screen interface")}
                role="button"
                tabIndex={0}
                aria-label="Open image in fullscreen"
                onKeyDown={(e) => e.key === 'Enter' && openImageModal("/your_session_screeen.png", "Your Sessions screen interface")}
              >
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="flex items-center gap-2 text-white">
                    <ZoomIn className="h-5 w-5" />
                    <span>Click to zoom</span>
                  </div>
                </div>
                {/* Use a static img tag for components with loading issues */}
                <div className="relative w-full pt-[70%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/your_session_screeen.png"
                    alt="Your Sessions screen showing current active session"
                    className="absolute top-0 left-0 w-full h-full object-contain"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Your Sessions screen (click to enlarge)
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <LayoutList className="h-5 w-5 text-purple-400" />
                Managing Your Active Sessions
              </h3>
              
              <div className="space-y-4 pl-3 sm:pl-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Your Sessions Tab</h4>
                  <p className="text-muted-foreground">
                    The Your Sessions tab provides a central hub for tracking and managing your game sessions:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>Always accessible from the main navigation bar at the top of the screen</li>
                    <li>Displays your current active session with its status (In Progress, Waiting, etc.)</li>
                    <li>Shows key session information including the Night Lord and start time</li>
                    <li>Lists all players in your session with their chosen Nightfarer characters</li>
                    <li>Identifies the host of the session with a special indicator</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    This screen serves as your home base for ongoing sessions, allowing you to quickly resume gameplay without having to search for your session again.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Returning to Your Active Session</h4>
                  <p className="text-muted-foreground">
                    If you navigate away from your session, you can easily return to it:
                  </p>
                  <ol className="list-decimal pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>Click on the "Your Sessions" tab in the main navigation</li>
                    <li>Your active session will be displayed prominently at the top</li>
                    <li>Click the "Continue Session" button to immediately return to your active session</li>
                    <li>All session details and chat history will be preserved exactly as you left them</li>
                  </ol>
                  <p className="text-muted-foreground mt-2">
                    This feature allows you to check other parts of the application without losing track of your ongoing session.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <a href="#" className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors">
              <ArrowUp className="h-3 w-3" />
              <span>Move to Top</span>
            </a>
          </div>
        </section>

        {/* Docs section divider */}
        <div className="divider"></div>

        {/* Session Limitations Section */}
        <section id="session-limitations" className="space-y-6 scroll-mt-20">
          <h2 className="section-title flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-purple-400" />
            Session Limitations
          </h2>

          <div className="gothic-card-no-hover p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative w-full overflow-hidden rounded-lg border border-purple-900/30 group cursor-pointer"
                onClick={() => openImageModal("/able_to_join_one_session.png", "Active session restriction notice")}
                role="button"
                tabIndex={0}
                aria-label="Open image in fullscreen"
                onKeyDown={(e) => e.key === 'Enter' && openImageModal("/able_to_join_one_session.png", "Active session restriction notice")}
              >
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="flex items-center gap-2 text-white">
                    <ZoomIn className="h-5 w-5" />
                    <span>Click to zoom</span>
                  </div>
                </div>
                {/* Use a static img tag for components with loading issues */}
                <div className="relative w-full pt-[60%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/able_to_join_one_session.png"
                    alt="Notice showing you cannot join multiple sessions simultaneously"
                    className="absolute top-0 left-0 w-full h-full object-contain"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Active session restriction notice (click to enlarge)
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-purple-400" />
                Understanding Session Restrictions
              </h3>
              
              <div className="space-y-4 pl-3 sm:pl-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">One Active Session Limit</h4>
                  <p className="text-muted-foreground">
                    Covenant Match has an important limitation to ensure fair play and system stability:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li><span className="font-semibold text-purple-300">You can only join or create one session at a time</span></li>
                    <li>If you attempt to join another session while one is active, you'll see a notification</li>
                    <li>This restriction applies whether you're the host or a participant</li>
                    <li>The system prevents you from browsing other sessions while in an active one</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    This limitation ensures that players remain committed to their current session and prevents them from joining multiple sessions simultaneously, which could lead to abandoned games.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">How to Join a New Session</h4>
                  <p className="text-muted-foreground">
                    Before you can join a different session, you must first:
                  </p>
                  <ol className="list-decimal pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>Leave your current session by clicking the "Leave Session" button</li>
                    <li>Wait for your current session to be completed or canceled</li>
                    <li>Finish reporting results if the session has ended</li>
                  </ol>
                  <p className="text-muted-foreground mt-2">
                    Once you've properly exited your current session, you'll be able to browse and join other available sessions again.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Rejoining Your Active Session</h4>
                  <p className="text-muted-foreground">
                    If you encounter the "You Currently Have an Active Session" notification:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li>Click the "Go to Your Active Session" button to return to your current session</li>
                    <li>You'll be redirected back to your session screen</li>
                    <li>This helps prevent accidental navigation away from active sessions</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    This system ensures that you never lose track of your active session and helps maintain a positive experience for all players by preventing abandoned sessions.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-300">Why This Limitation Exists</h4>
                  <p className="text-muted-foreground">
                    The one-session limit provides several important benefits:
                  </p>
                  <ul className="list-disc pl-4 sm:pl-6 text-muted-foreground space-y-1">
                    <li><span className="text-purple-300">Improved Session Quality</span> - Ensures all players are fully engaged in their current session</li>
                    <li><span className="text-purple-300">Reduced Abandonments</span> - Prevents players from leaving sessions without proper conclusion</li>
                    <li><span className="text-purple-300">System Stability</span> - Helps maintain smooth performance by limiting simultaneous connections</li>
                    <li><span className="text-purple-300">Fair Play</span> - Creates a level playing field where everyone follows the same rules</li>
                  </ul>
                  <p className="text-muted-foreground mt-2">
                    While this limitation may occasionally require you to wait before joining a new session, it significantly improves the overall experience for the entire community by promoting commitment and responsible participation.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <a href="#" className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors">
              <ArrowUp className="h-3 w-3" />
              <span>Move to Top</span>
            </a>
          </div>
        </section>

        {/* Full-screen image modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" 
            onClick={closeImageModal}
            role="dialog"
            aria-modal="true"
            aria-label={modalAlt}
          >
            <div className="absolute top-4 right-4 z-50">
              <button 
                onClick={closeImageModal}
                className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-full"
                aria-label="Close modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="max-h-[90vh] max-w-[90vw] relative overflow-auto" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={modalImage} 
                alt={modalAlt}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
