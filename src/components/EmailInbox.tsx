import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Mail, MailOpen, Send, RefreshCw, Archive, ArrowLeft, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReceivedEmail {
  id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string;
  body_text: string | null;
  body_html: string | null;
  received_at: string;
  is_read: boolean;
  is_archived: boolean;
  status: string;
  created_at: string;
}

interface EmailReply {
  id: string;
  received_email_id: string;
  replied_by: string;
  reply_text: string;
  sent_at: string;
}

export const EmailInbox = () => {
  const { toast } = useToast();
  const [emails, setEmails] = useState<ReceivedEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<ReceivedEmail | null>(null);
  const [replies, setReplies] = useState<EmailReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showReplyDialog, setShowReplyDialog] = useState(false);

  const loadEmails = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      let query = supabase
        .from('received_emails')
        .select('*')
        .eq('is_archived', false)
        .order('received_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  const loadReplies = async (emailId: string) => {
    const { data, error } = await supabase
      .from('email_replies')
      .select('*')
      .eq('received_email_id', emailId)
      .order('sent_at', { ascending: true });

    if (!error) setReplies(data || []);
  };

  useEffect(() => {
    loadEmails();
  }, [statusFilter]);

  useEffect(() => {
    const channel = supabase
      .channel('received_emails_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'received_emails' }, () => {
        loadEmails();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [statusFilter]);

  const openEmail = async (email: ReceivedEmail) => {
    setSelectedEmail(email);
    loadReplies(email.id);

    if (!email.is_read) {
      await supabase
        .from('received_emails')
        .update({ is_read: true })
        .eq('id', email.id);
    }
  };

  const updateStatus = async (emailId: string, status: string) => {
    await supabase
      .from('received_emails')
      .update({ status })
      .eq('id', emailId);

    if (selectedEmail?.id === emailId) {
      setSelectedEmail(prev => prev ? { ...prev, status } : null);
    }
    toast({ title: 'Statut mis à jour' });
  };

  const archiveEmail = async (emailId: string) => {
    await supabase
      .from('received_emails')
      .update({ is_archived: true })
      .eq('id', emailId);

    setSelectedEmail(null);
    toast({ title: 'Email archivé' });
  };

  const sendReply = async () => {
    if (!selectedEmail || !replyText.trim()) return;
    setSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('reply-email', {
        body: {
          emailId: selectedEmail.id,
          replyText: replyText.trim(),
          toEmail: selectedEmail.from_email,
          subject: selectedEmail.subject,
        },
      });

      if (error) throw error;

      toast({ title: 'Réponse envoyée', description: `Réponse envoyée à ${selectedEmail.from_email}` });
      setReplyText('');
      setShowReplyDialog(false);
      loadReplies(selectedEmail.id);
      loadEmails();
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast({ title: 'Erreur', description: "Impossible d'envoyer la réponse", variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'nouveau': return <AlertCircle className="h-3 w-3" />;
      case 'en_cours': return <Clock className="h-3 w-3" />;
      case 'traité': return <CheckCircle2 className="h-3 w-3" />;
      default: return null;
    }
  };

  const statusVariant = (status: string): "default" | "secondary" | "outline" => {
    switch (status) {
      case 'nouveau': return 'default';
      case 'en_cours': return 'secondary';
      case 'traité': return 'outline';
      default: return 'default';
    }
  };

  const unreadCount = emails.filter(e => !e.is_read).length;

  if (selectedEmail) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
            <div className="flex-1">
              <CardTitle className="text-lg">{selectedEmail.subject}</CardTitle>
              <CardDescription>
                De : {selectedEmail.from_name ? `${selectedEmail.from_name} <${selectedEmail.from_email}>` : selectedEmail.from_email}
                {' · '}
                {format(new Date(selectedEmail.received_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedEmail.status} onValueChange={(val) => updateStatus(selectedEmail.id, val)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nouveau">Nouveau</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="traité">Traité</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => archiveEmail(selectedEmail.id)}>
                <Archive className="h-4 w-4 mr-1" /> Archiver
              </Button>
              <Button size="sm" onClick={() => setShowReplyDialog(true)}>
                <Send className="h-4 w-4 mr-1" /> Répondre
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email body */}
          <div className="border rounded-lg p-4 bg-muted/30">
            {selectedEmail.body_html ? (
              <div dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} className="prose max-w-none prose-sm" />
            ) : (
              <pre className="whitespace-pre-wrap text-sm font-sans">{selectedEmail.body_text || '(contenu vide)'}</pre>
            )}
          </div>

          {/* Replies */}
          {replies.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">Réponses envoyées ({replies.length})</h3>
              {replies.map(reply => (
                <div key={reply.id} className="border-l-2 border-primary pl-4 py-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    {format(new Date(reply.sent_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{reply.reply_text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Reply dialog */}
          <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Répondre à {selectedEmail.from_name || selectedEmail.from_email}</DialogTitle>
              </DialogHeader>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Saisissez votre réponse..."
                rows={8}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReplyDialog(false)}>Annuler</Button>
                <Button onClick={sendReply} disabled={sending || !replyText.trim()}>
                  {sending ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                  Envoyer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Messagerie
              {unreadCount > 0 && (
                <Badge variant="default" className="ml-1">{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</Badge>
              )}
            </CardTitle>
            <CardDescription>Emails reçus sur contact@balzac.education</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filtre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="nouveau">Nouveau</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="traité">Traité</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => loadEmails(true)} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : emails.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucun email reçu</p>
            <p className="text-sm mt-1">Les emails envoyés à contact@balzac.education apparaîtront ici</p>
          </div>
        ) : (
          <div className="divide-y">
            {emails.map(email => (
              <div
                key={email.id}
                onClick={() => openEmail(email)}
                className={`flex items-center gap-3 py-3 px-2 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors ${
                  !email.is_read ? 'font-semibold' : ''
                }`}
              >
                {email.is_read ? (
                  <MailOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm truncate">
                      {email.from_name || email.from_email}
                    </span>
                    <Badge variant={statusVariant(email.status)} className="text-[10px] flex items-center gap-1">
                      {statusIcon(email.status)}
                      {email.status === 'nouveau' ? 'Nouveau' : email.status === 'en_cours' ? 'En cours' : 'Traité'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{email.subject}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(email.received_at), 'dd/MM/yy HH:mm', { locale: fr })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
