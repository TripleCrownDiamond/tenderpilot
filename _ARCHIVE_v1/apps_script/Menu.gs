/**
 * TenderPilot - menu, actions et declencheurs.
 *
 * C'est la seule partie que l'utilisateur voit. Elle doit rester simple :
 * un menu, deux formulaires, des messages en francais courant, jamais de
 * jargon technique ni de trace d'erreur brute.
 */

var MENU_TITLE = 'TenderPilot';
var DAILY_HANDLER = 'dailyCheck';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(MENU_TITLE)
    .addItem('Ajouter une opportunite...', 'showAddOpportunity')
    .addSeparator()
    .addItem('Verifier les deadlines', 'runDeadlineCheck')
    .addItem('Relever mes alertes email', 'runGmailImport')
    .addItem('Relever mes flux RSS', 'runRssImport')
    .addItem('Envoyer les rappels maintenant', 'runSendReminders')
    .addSeparator()
    .addItem('Configuration...', 'showSetup')
    .addItem('Activer les cases a cocher', 'runEnableCheckboxes')
    .addItem('Activer les rappels automatiques', 'installDailyTrigger')
    .addItem('Desactiver les rappels automatiques', 'removeDailyTrigger')
    .addSeparator()
    .addItem('Aide', 'showHelp')
    .addToUi();
}

/** Message d'erreur lisible : l'utilisateur ne doit jamais voir de stack. */
function fail_(action, error) {
  console.error(action + ' : ' + error.stack);
  appendLog_('ERREUR', 'MENU', action, '', error.message);
  var ui = SpreadsheetApp.getUi();
  ui.alert(MENU_TITLE,
           'L operation a echoue.\n\n' + error.message +
           '\n\nSi le probleme persiste, verifiez que les onglets et les ' +
           'colonnes n ont pas ete renommes.',
           ui.ButtonSet.OK);
}

function toast_(message) {
  SpreadsheetApp.getActive().toast(message, MENU_TITLE, 6);
}

// ------------------------------------------------------------ formulaires --

function showAddOpportunity() {
  var html = HtmlService.createHtmlOutputFromFile('AddOpportunity')
    .setTitle('Ajouter une opportunite');
  SpreadsheetApp.getUi().showSidebar(html);
}

function showSetup() {
  var html = HtmlService.createHtmlOutputFromFile('Setup')
    .setTitle('Configuration TenderPilot');
  SpreadsheetApp.getUi().showSidebar(html);
}

/** Options des listes deroulantes du formulaire. */
function getFormOptions() {
  return {
    countries: listOptions_(SCHEMA.LISTS.country),
    sectors: listOptions_(SCHEMA.LISTS.sector),
    types: listOptions_(SCHEMA.LISTS.type),
    currencies: listOptions_(SCHEMA.LISTS.currency),
    statuses: listOptions_(SCHEMA.LISTS.status)
  };
}

/**
 * Enregistre une opportunite saisie dans la barre laterale et calcule au
 * passage son score de pertinence.
 */
function submitOpportunity(form) {
  var errors = validateOpportunity(form);
  if (errors.length) return { ok: false, errors: errors };

  var deadline = new Date(form.deadline);
  var scored = relevanceScore({
    title: form.title,
    organization: form.organization,
    country: form.country,
    sector: form.sector,
    type: form.type,
    notes: form.notes,
    budget: form.budget === '' ? '' : Number(form.budget),
    daysRemaining: daysRemaining(deadline, new Date())
  }, readWatchlist());

  var result = appendOpportunity_({
    title: form.title,
    organization: form.organization,
    country: form.country,
    sector: form.sector,
    type: form.type,
    sourceUrl: form.sourceUrl,
    deadline: deadline,
    budget: form.budget,
    currency: form.currency,
    notes: form.notes,
    relevance: scored.score
  });

  if (!result.added) return { ok: false, errors: [result.reason] };

  appendLog_('INFO', 'FORMULAIRE', 'Ajout opportunite', result.id,
             'Score ' + scored.score + ' - ' + scored.detail.join(' / '));

  return {
    ok: true,
    id: result.id,
    score: scored.score,
    label: relevanceLabel(scored.score),
    excluded: scored.excluded,
    detail: scored.detail
  };
}

// -------------------------------------------------------------- deadlines --

function runDeadlineCheck() {
  try {
    var count = fillDeadlinesList();
    appendLog_('INFO', 'ECHEANCES', 'Liste regeneree', '', count + ' ligne(s)');
    toast_(count === 0
      ? 'Aucune deadline dans les 15 jours.'
      : count + ' opportunite(s) a surveiller. Voir l onglet ' +
        SCHEMA.SHEETS.deadlines + '.');
  } catch (e) {
    fail_('Verifier les deadlines', e);
  }
}

/** Corps du rappel, separe de l'envoi pour rester lisible et testable. */
function buildReminderBody_(due, orgName) {
  var lines = [];
  lines.push('Bonjour,');
  lines.push('');
  lines.push(due.length === 1
    ? 'Une opportunite arrive a echeance :'
    : due.length + ' opportunites arrivent a echeance :');
  lines.push('');
  due.forEach(function (item) {
    lines.push('- ' + item.title);
    if (item.organization) lines.push('  Organisation : ' + item.organization);
    lines.push('  Deadline : dans ' + item.days + ' jour(s)');
    lines.push('  Statut : ' + (item.status || 'Non defini'));
    if (item.url) lines.push('  Lien : ' + item.url);
    lines.push('');
  });
  lines.push('Ouvrez votre Command Center pour agir.');
  lines.push('');
  lines.push('TenderPilot' + (orgName ? ' - ' + orgName : ''));
  return lines.join('\n');
}

/** Opportunites dont le palier de rappel tombe aujourd'hui. */
function dueForReminder_(reminderDays) {
  var today = new Date();
  var due = [];
  readOpportunities_().forEach(function (o) {
    var days = daysRemaining(o[SCHEMA.OPP.deadline], today);
    if (!shouldRemind(days, o[SCHEMA.OPP.status], reminderDays)) return;
    due.push({
      id: o[SCHEMA.OPP.id],
      title: o[SCHEMA.OPP.title],
      organization: o[SCHEMA.OPP.organization],
      status: o[SCHEMA.OPP.status],
      url: o[SCHEMA.OPP.sourceUrl],
      days: days
    });
  });
  due.sort(function (a, b) { return a.days - b.days; });
  return due;
}

function sendReminders_(silent) {
  var settings = readSettings();
  if (String(settings.reminders_enabled).toUpperCase() !== 'OUI') {
    if (!silent) toast_('Les rappels sont desactives dans la configuration.');
    return 0;
  }
  var email = String(settings.notify_email || '').trim();
  if (!email) {
    if (!silent) toast_('Aucun email de notification configure.');
    return 0;
  }

  var due = dueForReminder_(parseReminderDays(settings.reminder_days));
  if (!due.length) {
    if (!silent) toast_('Aucun rappel a envoyer aujourd hui.');
    return 0;
  }

  MailApp.sendEmail(email,
                    'TenderPilot - ' + due.length + ' echeance(s) a suivre',
                    buildReminderBody_(due, settings.org_name));
  appendLog_('INFO', 'RAPPELS', 'Email envoye', '',
             due.length + ' opportunite(s) vers ' + email);
  if (!silent) toast_('Rappel envoye a ' + email + '.');
  return due.length;
}

function runSendReminders() {
  try {
    sendReminders_(false);
  } catch (e) {
    fail_('Envoyer les rappels', e);
  }
}

// ------------------------------------------------------ alertes par email --

/**
 * Importe les emails portant le label configure.
 *
 * On ne lit que ce label : le script ne parcourt jamais la boite de
 * reception. C'est le canal de synchronisation le plus fiable, parce qu'il
 * repose sur les alertes que les plateformes envoient deja.
 */
function importFromGmail_() {
  var settings = readSettings();
  var labelName = String(settings.gmail_label || '').trim();
  if (!labelName) {
    return { imported: 0, skipped: 0, message: 'Aucun label Gmail configure.' };
  }

  var label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    return { imported: 0, skipped: 0,
             message: 'Le label Gmail "' + labelName + '" n existe pas encore. ' +
                      'Creez-le dans Gmail, puis un filtre qui l applique a ' +
                      'vos alertes.' };
  }

  var imported = 0;
  var skipped = 0;
  label.getThreads(0, 40).forEach(function (thread) {
    var message = thread.getMessages()[0];
    var result = appendOpportunity_({
      title: message.getSubject(),
      organization: message.getFrom().replace(/<[^>]*>/g, '').trim(),
      sourceUrl: firstUrl(message.getPlainBody()),
      deadline: '',
      status: 'A lire',
      notes: 'Importe depuis Gmail le ' +
             Utilities.formatDate(message.getDate(),
                                  Session.getScriptTimeZone(), 'yyyy-MM-dd') +
             '. Deadline a renseigner.'
    });
    if (result.added) imported++;
    else skipped++;
  });

  appendLog_('INFO', 'GMAIL', 'Import', '',
             imported + ' importee(s), ' + skipped + ' doublon(s)');
  return { imported: imported, skipped: skipped, message: '' };
}

function runGmailImport() {
  try {
    var result = importFromGmail_();
    if (result.message) {
      toast_(result.message);
      return;
    }
    toast_(result.imported + ' opportunite(s) importee(s), ' +
           result.skipped + ' doublon(s) ignore(s). ' +
           'Pensez a renseigner les deadlines.');
  } catch (e) {
    fail_('Relever les alertes email', e);
  }
}

// -------------------------------------------------------------- flux RSS --

/**
 * Importe les entrees des flux RSS des sources actives.
 *
 * Une source en panne ne doit pas empecher les autres de remonter : chaque
 * flux est isole dans son propre try/catch et compte comme un echec, pas
 * comme une interruption.
 *
 * Les entrees ecartees par un mot-cle negatif ne sont pas importees du tout :
 * c'est un veto explicite de l'utilisateur, pas un simple malus.
 */
function importFromRss_() {
  var feeds = activeFeeds_();
  if (!feeds.length) {
    return { imported: 0, skipped: 0, failed: 0, excluded: 0,
             message: 'Aucune source RSS active. Renseignez la colonne ' +
                      SCHEMA.SRC.rssUrl + ' dans l onglet ' +
                      SCHEMA.SHEETS.sources + ', et mettez ' +
                      SCHEMA.SRC.active + ' a OUI.' };
  }

  var watchlist = readWatchlist();
  var today = new Date();
  var imported = 0, skipped = 0, failed = 0, excluded = 0;

  feeds.forEach(function (source) {
    var url = String(source[SCHEMA.SRC.rssUrl]).trim();
    try {
      var response = UrlFetchApp.fetch(url, {
        muteHttpExceptions: true,
        followRedirects: true,
        validateHttpsCertificates: true
      });
      if (response.getResponseCode() !== 200) {
        failed++;
        appendLog_('ERREUR', 'RSS', 'Flux injoignable',
                   source[SCHEMA.SRC.id],
                   'Code HTTP ' + response.getResponseCode() + ' - ' + url);
        return;
      }

      parseFeedXml(response.getContentText()).forEach(function (item) {
        var scored = relevanceScore({
          title: item.title,
          organization: source[SCHEMA.SRC.name],
          country: source[SCHEMA.SRC.country],
          type: source[SCHEMA.SRC.type],
          notes: item.summary,
          daysRemaining: item.deadline
            ? daysRemaining(item.deadline, today) : null
        }, watchlist);

        if (scored.excluded) {
          excluded++;
          return;
        }

        var result = appendOpportunity_({
          title: item.title,
          organization: source[SCHEMA.SRC.name],
          country: source[SCHEMA.SRC.country],
          type: source[SCHEMA.SRC.type],
          sourceUrl: item.link,
          deadline: item.deadline || '',
          status: 'A lire',
          relevance: scored.score,
          notes: 'Importe du flux ' + source[SCHEMA.SRC.id] +
                 (item.deadline ? '' : '. Deadline a renseigner.')
        });
        if (result.added) imported++;
        else skipped++;
      });
    } catch (e) {
      failed++;
      appendLog_('ERREUR', 'RSS', 'Lecture impossible', source[SCHEMA.SRC.id],
                 e.message + ' - ' + url);
    }
  });

  appendLog_('INFO', 'RSS', 'Import', '',
             imported + ' importee(s), ' + skipped + ' doublon(s), ' +
             excluded + ' ecartee(s), ' + failed + ' flux en echec');
  return { imported: imported, skipped: skipped, failed: failed,
           excluded: excluded, message: '' };
}

function runRssImport() {
  try {
    var result = importFromRss_();
    if (result.message) {
      toast_(result.message);
      return;
    }
    var message = result.imported + ' opportunite(s) importee(s), ' +
                  result.skipped + ' doublon(s), ' +
                  result.excluded + ' ecartee(s) par vos mots-cles.';
    if (result.failed) {
      message += ' ' + result.failed + ' flux injoignable(s) - voir l onglet ' +
                 SCHEMA.SHEETS.logs + '.';
    }
    toast_(message);
  } catch (e) {
    fail_('Relever les flux RSS', e);
  }
}

function runEnableCheckboxes() {
  try {
    var n = enableCheckboxes();
    appendLog_('INFO', 'CIBLES', 'Cases a cocher activees', '', n + ' lignes');
    toast_(n + ' lignes converties en cases a cocher dans l onglet ' +
           SCHEMA.SHEETS.watchlist + '.');
  } catch (e) {
    fail_('Activer les cases a cocher', e);
  }
}

// ---------------------------------------------------------- declencheurs --

function removeDailyTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === DAILY_HANDLER) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function hasDailyTrigger_() {
  return ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === DAILY_HANDLER;
  });
}

function installDailyTrigger() {
  try {
    removeDailyTrigger_();
    ScriptApp.newTrigger(DAILY_HANDLER).timeBased().atHour(7)
             .everyDays(1).create();
    appendLog_('INFO', 'TRIGGER', 'Rappels automatiques actives', '', '');
    toast_('Rappels automatiques actives. Verification chaque matin vers 7h.');
  } catch (e) {
    fail_('Activer les rappels automatiques', e);
  }
}

function removeDailyTrigger() {
  try {
    removeDailyTrigger_();
    appendLog_('INFO', 'TRIGGER', 'Rappels automatiques desactives', '', '');
    toast_('Rappels automatiques desactives.');
  } catch (e) {
    fail_('Desactiver les rappels automatiques', e);
  }
}

/**
 * Execute chaque matin. Chaque etape est isolee : si la lecture Gmail
 * echoue, les rappels partent quand meme.
 */
function dailyCheck() {
  try {
    fillDeadlinesList();
  } catch (e) {
    appendLog_('ERREUR', 'TRIGGER', 'Liste deadlines', '', e.message);
  }
  try {
    importFromGmail_();
  } catch (e) {
    appendLog_('ERREUR', 'TRIGGER', 'Import Gmail', '', e.message);
  }
  try {
    importFromRss_();
  } catch (e) {
    appendLog_('ERREUR', 'TRIGGER', 'Import RSS', '', e.message);
  }
  try {
    sendReminders_(true);
  } catch (e) {
    appendLog_('ERREUR', 'TRIGGER', 'Rappels', '', e.message);
  }
}

// ---------------------------------------------------------- configuration --

/** Etat courant, pour pre-remplir l'assistant. */
function getSetupData() {
  var settings = readSettings();
  return {
    settings: {
      org_name: settings.org_name || '',
      timezone: settings.timezone || Session.getScriptTimeZone(),
      notify_email: settings.notify_email || Session.getActiveUser().getEmail(),
      reminders_enabled: String(settings.reminders_enabled || 'OUI'),
      reminder_days: settings.reminder_days || '14;7;3;1',
      gmail_label: settings.gmail_label || 'TenderPilot'
    },
    watchlist: readWatchlist(),
    options: getFormOptions(),
    triggerActive: hasDailyTrigger_()
  };
}

/** Enregistre l'assistant de configuration. */
function saveSetup(form) {
  try {
    writeSettings_({
      org_name: form.org_name,
      timezone: form.timezone,
      notify_email: form.notify_email,
      reminders_enabled: form.reminders_enabled,
      reminder_days: form.reminder_days,
      gmail_label: form.gmail_label
    });

    var sheet = getSheet_(SCHEMA.SHEETS.watchlist);
    var rows = readLabelledRows_(SCHEMA.SHEETS.watchlist);
    var L = SCHEMA.WATCHLIST_LABELS;

    function setValue(key, value) {
      var entry = rows[L[key]];
      if (entry) sheet.getRange(entry.row, 2).setValue(value);
    }
    setValue('positive_keywords', form.positiveKeywords || '');
    setValue('negative_keywords', form.negativeKeywords || '');
    setValue('min_budget', form.minBudget || '');
    setValue('min_days', form.minDays || 7);

    // Zone de selection : on coche ce que l'utilisateur a choisi.
    var headerRow = targetsHeaderRow_(rows);
    if (headerRow) {
      SCHEMA.WATCHLIST_BLOCKS.forEach(function (bloc) {
        setCheckedValues_(sheet, headerRow, bloc, form[bloc.key]);
      });
      // Les vraies cases a cocher n'existent que dans Google Sheets : on les
      // installe ici, pour que l'utilisateur n'ait pas a y penser.
      try {
        enableCheckboxes();
      } catch (e) {
        console.error('Cases a cocher non installees : ' + e.message);
      }
    }

    if (String(form.reminders_enabled).toUpperCase() === 'OUI'
        && !hasDailyTrigger_()) {
      ScriptApp.newTrigger(DAILY_HANDLER).timeBased().atHour(7)
               .everyDays(1).create();
    }

    appendLog_('INFO', 'CONFIGURATION', 'Enregistree', '', '');
    return { ok: true, triggerActive: hasDailyTrigger_() };
  } catch (e) {
    console.error(e.stack);
    return { ok: false, errors: [e.message] };
  }
}

// ------------------------------------------------------------------- aide --

function showHelp() {
  var settings = readSettings();
  var ui = SpreadsheetApp.getUi();
  ui.alert(MENU_TITLE,
    'Ajouter une opportunite : ouvre un formulaire. Seuls le titre et la ' +
    'deadline sont obligatoires.\n\n' +
    'Verifier les deadlines : remplit l onglet ' + SCHEMA.SHEETS.deadlines +
    ' avec tout ce qui arrive a echeance dans les 15 jours.\n\n' +
    'Relever mes alertes email : importe les emails portant le libelle "' +
    (settings.gmail_label || 'TenderPilot') + '" dans Gmail. Creez d abord ' +
    'un filtre Gmail qui applique ce libelle a vos alertes.\n\n' +
    'Relever mes flux RSS : lit les adresses de flux renseignees dans ' +
    'l onglet ' + SCHEMA.SHEETS.sources + ' et cree une ligne par annonce. ' +
    'Les annonces contenant un de vos mots-cles negatifs ne sont pas ' +
    'importees.\n\n' +
    'Rappels automatiques : une verification chaque matin, et un email quand ' +
    'une deadline approche. Les dossiers deja soumis ne declenchent jamais ' +
    'de rappel.\n\n' +
    'Configuration : pays, secteurs, mots-cles, email de notification.',
    ui.ButtonSet.OK);
}
