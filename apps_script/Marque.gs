/**
 * Le logo, embarque pour les emails.
 *
 * FICHIER GENERE par builders/marque.py depuis
 * data/marque/tenderpilot-logo.png. Ne pas editer a la main.
 *
 * Il voyage en piece jointe INLINE dans chaque alerte : une image
 * distante serait bloquee par la plupart des messageries tant que
 * le lecteur n'a pas clique "afficher les images", et supposerait
 * un hebergement a maintenir.
 */
var LOGO_EMAIL_BASE64 = [
  'iVBORw0KGgoAAAANSUhEUgAAAUAAAABHCAMAAABBPG6UAAAAwFBMVEUALmkAWtcAYuIAI10ASbsA',
  'cPsALJsAqv8AM+AAIFUAcPoAf38AaKsAFjwAIVoAIDQASrgARbQBO6UAAAAAG0cAXPQAaPwAVvoA',
  'fv4Acv4AAFQAAP8AG0oAGkgAGUkAAD4AR7cAGkcAAH4AXPQAXfUAGkcAXPUAGkgAXPIAPv8AGkcA',
  'ZfQAZvQAXfQAafoAJVAAavkAaPUAavcA//8AGzwAavYAXPIAVaoAVtIAWdcAProATcQAJmsAIFYA',
  'MzMASLQtU8ZGAAAAQHRSTlMcDpRlm8wJAwb9WgIG+5UTxXX9APv7/AgC/QMBTNMVBPyRAi2sKs5t',
  'cQSvEi2SzwyvUJABC3BTA/wLBv4VTgQKP8wIEAAADghJREFUeNrtnAl3m0gSgOUzmSSzM7tt0UAL',
  'MEjoAt2yZPnK//9XW9U30Mj2OvPe5lmVPBkLgcWnurtQh9RkO5pGIDdtEp1TsicnUdKp/d5rRyel',
  'Oz8RbAOYJdPX8P150/WGhxNBJ8CQpDevS9dDgv4JXQNgSHo3bwHY7XoDeiLo0MD45o0AuycddABM',
  'yEgiSnttknITRoLLAzsRrALMiIwgefurRwogWDE5EayZ8FZkMCkJW8UABIIFYyd+FYBCAXtZ2PLa',
  'xNJAJLj3TwRtgDKG9MjbAKIV0xPBDwDsejNy0sH3A7zXAJFgmw4ySv0TQAfAP2/uu12boLOo2/gn',
  'DXQChFLlz/94FkDvzpFQ+18IOazOv32KXPs9ADOS4wtuu7ac1TH5lBB6dxUE5yeADYJsyhsyN3/8',
  '8Yd8uLkAxazhK86DwPOCFaEngHUVfGq0C0c2QAwcJeBDfvMDYZ8XIMRQ36covhLcnJBOveNlaSDd',
  'AL61F3jB/X0QrMmXUxBxyVMHpNfL86iqgZjQrJaIL7h/9Dyv/Bz9GidAlo2XA5eMqW/o2gCZwMdt',
  '17u9BX5zsvkdeWyEuX0M4J7svBYZk4dMNhauI23CDI11NUd8il9w988qYCbkXccw35ZNxUNTf/PA',
  'fpUG/iQzjzf9PK9bFUicJzUNvCAZ5i1C+wDfPef3W1iwP9FGwtQjLcs+yNmHAHYYnXOA3Yb0DRYm',
  'AD7/gHdyJ7TP8AuW4oWdp6dFZwHS6Sw6SbhYJFkWJsni5WPqR/IplzR5z2FnZ4CGIp+C0oIepONG',
  'lGS3XM5wnWIgLK3/5o/f7QPJgX8OffFohFqZiY8Ao1FCim9XAh83X6F/MglcRG0SfwSgWb3Zvv2g',
  'CRnrPhJ/HIJLJxyUT+7wTc8LCgC55X0QYHsCZweG6Ca6gKxZaR8IqN9tl2/NfX6ORevKyq8BGL0f',
  'oKcdE26B1qHeUbFOMSMKYPkBgM+YxrD9niqZcOGbNtj9vxAfpn2ep8339l5sr8UbiP9pgPE7AYq3',
  'atXy8z7kvBA0ZYOTA+we1UDAPUSZz7g6tQCkTAnAVFuMWQT9nxV8sPGo+clPMPvnNTB+vwbWwiK8',
  '1YKUGuBSbB0F2Befw5Ab2fsTaVOzrbXtSvNV/IK5v+FB7en/yIR9DrDOrwueD4qsIWe7kxrY7ZbH',
  'AYql3VaACZuMQUcHw4asKV9I0jVbjd+j0kaVBL4XYNb6S+VJA3BRzQ1duaLahRroaednDBk8X0H6',
  'c3SIbKIA2hrINv539g6Az+QHT6TrKaBMpCcM8fGazZJbLvpXn3wXAFMpqgcxlb+P4MoTeb2Jg1Qo',
  'rCDMag1J8SNpaqA8QP+saWwlCs/GILOBVkKkRXerEr1hHSB01mXOqIgWEwVw8hVCgzuRHjtSQH7Q',
  'mnxlTXz3VX4qCbSk11A8vKhtnMexxQl+/SuGB9z5gj8rahjyV/Bnw5oPDInZpzxQkguJ4RSQhMYK',
  'IGiOkP5QXtRYZx0NgEjvK4ZPaXfiya51HgvgQgHM2GHg5jcvGbmu46vzwyTQ14rBJVEA8yThT0Ai',
  'HcMgIjKYprm4aD0aMSUk5zobpZVFfvHkzXS0rQURQNTjJ4MjegK6bP7yYp0fFz1ogBNUnclEmiLG',
  'jmKHSjnusypA8FeH1WAocsa+wMl245nU3PFqPN61BRFI1QtI2uGHyqeLflEUxF/N6/XxreRnqBa1',
  'RDKpa2BIYrstNs3xbxqAW7PT1BoL64heXtVAe6ox6pEKwJ7429E1ZMsigZYnPEhaoEp9r2vlgQog',
  '/N8NpTODR54zkv3QeE/c1wSIF9M6c0D386r2KfW7vTcJzbpuwWENIFxdrTELkcsArMzHTqV9bytH',
  'RHYQCWs9ynRrA5QDK1oDNcAJU57K73cdAMExDrzKAtAKHKkI2EZaNJD5tC7YwWAZg+jr5Gc9V74C',
  '0FycTTA0001VHPh+sq1zchYBhqQxFTpdQCyp/43rug+cyPy526UugBkrhvWkB5pRdNhtA7iwSjnm',
  'yn+UFlpO8LbJTyaBxzQwdtDIycIN8CZvH/0EgIlrV0pe6gCjJkCtgYUDIN37g0YoBR0sqgCHHZNg',
  'LWo+EP7hIzpD3LBWjUh5N0eG9w5+rk5gFWBmVMaaZo+gQ+MGmALaltFPTGPMLsv0wQ/WNdAEEVFY',
  '0QmRLIbEAfAMenq2r5NbmHM7faBvmXDGaBP+UAd7hmWID2qo+T1WrLpo9CIqQcTQjHox2eapjpYW',
  'wOkoNWhtK41Saw8GkUT9NooxsqsdDTdhRWH1tsY6CpdNgCpGQ7QdWEnjjEDAVkTGJgr75Kevg0hL',
  'HlgYzeI978tHBdDGB0kgJccAagWcxmboUOwbWQpk4YwNjBE2EjUm1MCeMXSMNjr22gDTXt55+qqD',
  'iPDp/ZmCsnNpoFJAHGfGfrunKbjyQAq5MV3YibQodjQW/CAKu5nFznwNsKJ/wYp9OQYw1C0anVRP',
  '1R8emaVSyBe1czNkUyxDILFJjQamldVVrd6pBTCv9QN5VWrK4iF1mvBQqSd5gIJDEfTGdFKqSmSi',
  'KhE4A8xoPBkTPpvp8nc+nM/n+HNVtcwHci4Bdr1XLLgC8EVtT+MwFjJS16x1MeMVnlEulYosZIWn',
  'ohBooNzKt/EWTpXEsbL73ArwoayFndXBjrgAlroHzxcxCqmRCLRRC1NWeN5ZNYjsD2cHSuF/4fP+',
  'd1GjQjXA+0piCEkgJccAtsVaLEBMJVJJdmJFKZXVsI68UdjacYxzy4XWOtIVfgMycQHULUJfOi3p',
  'E4fNZgKbZEu47kpH2j+SxvAGBSzdSYDdamZdvgLwr9abUSIDsFqMxUltCsJkjI6Msg5QUXcDBBf3',
  '3WnCd7I4YRO53iRtGjxZHSAla7zuainHGlJlCb0LAfDxb7s2CeZ0Q44AzMGE3w9wcVNtVZpA3g4w',
  'z2vUXQChnvVRWxxRWIbsMVEAmUyraR0g+kcInfu3N1R9UiznhQD4+HenPJ4E/gKAYWQKvsr5ov8J',
  'oImMsz6i0UY5aAI0GuhLDawDZP4BkuI7dvZWgJDClFcBaCwCfLz8CUtawZEyrp5Iax8YpTUZVQGS',
  'dh8YNn1g/WRp3A6QD1nMZuOSigaLE+Cq7gPLesyWAMX1l2/WQDjfN2xYfcU88PHymjz4+2XQ3gms',
  'AzRRmDhvQ3EA1FH4ZsHvIAizWOeBWdTW4W4FOKyuTLQA1FGYPYhEpRmFuVvrbHxQwKuzeinX1o2B',
  '5elznLzyH8jl7e3lD0gaKSmsTuAPQsjb8sCcxC9J8rIgubgNKm4z4dzOA0PsOTfzwJRsF5Aibkms',
  'TtYOEBYa+WKjWiJz+MBSdV0QWMGbhyoPtNIY+nXid8gq4IrzFoBQB9M7mP5bHih8LpePlwm5uCAh',
  'xXO0JoHNUk5ldXlFVaKk1QcaT5eippleYmRzqnS98laAoDm1N+kMIroSWfOsYqcqYKoqkW53JyoR',
  'sD/UqOxVE95AhfENQm5wVcCSxwP59yUhz/z9+WQdtCaBTYCmMIPUNx81auEmQCvwTNNppRsT6uWW',
  'fMti1VmdkiMAm17JAZDpWngIayhWLfyF6I7WDGvhUrdAjwPcyOFTUFd5r+s1v2J8fxu/ELlM+QaA',
  'ld6U1Y2JwyMAW4It9gPzRptVVG8f0kBcLK4EbZX4UOiUqhfhnlnnLggkwGMmjN0DX4w+L829wqma',
  'UIW3wAc6zhh5HSDJXP3AnonPTYBZS/mCGujalYJltQN8eIsJg5d09AN3EGypbsTiIR2MoGh6zNTC',
  'DYC4KFV84/iC5V7yy4QiiRHfHxjLW2cC7TywEiHtUevwiA/Mwmza1g90NFsrHekmQL8B0NWR3rBi',
  '0OxI87RnPzCLyp15IOqHrA0gEx1UYIdyZ8q81H5/PvrS8lWA7WsiITkCEPvlU9eayJa/cHRsTeQt',
  'PrBlTaSorYnshIfymV4YQYDc+5fQgX2yZmOsO7aIWgfG6ecV2TPXiC/57hfLdds8REMDgdYoal+V',
  'cwGsLL2N1K4XUSXk0/ZVORugnGlpAhR7RB6o5wNxVW7e1bOma6o8PC43iX60BBgEV/7ebwD0v+AB',
  'xUrNrwVXFRWrDpkzPefpHIhU9YFFtZdiCImmI7kurF/Vk4l0LCsUddCWL/7CAbHepdfVc77KHMG6',
  'cMaPZiQWM5hTZVHgusTg96w5s0f5jiXkJXI4nPLeJxrbaoa9Q7MurKqJ/piPvuw6InzCbUVk/zzV',
  '3RiYtRba+g1GYAJPTO+uD+SBtAGE9sPmfQNCfDQhdg21HD0iMcMH1amYJF4siGPnR4RDOIjxDrtN',
  'IvzYdxx6EGUYBIcSs8LOxcWTHgMpV+u5pyawAuioVk00at5o0y6JENf8izUbI14Uth0kjsiS5ivh',
  'SXEW6yk+AmHfPb6RC7TOe0v5yi3WCrVBSLlNJ/U72vgTG7+jOgGgYKuDPmFR3nF4usgN0ANUTfRd',
  'AH9nYW1zBvh8pzCtqMCbL9cgy+Xc40HX7EH9rH9ynwbgKyO+VjMqMKI8nwgxYL2NuyjCE0AOENqB',
  'gfumGoEQ8SXk+rr+BR4qTej9Uqf9OwIkZRC0AERNxNjhkoX+lpnsk5swbzC3EVwCvqfnXu/5+bn6',
  'HUYqD44I+fRfOgF59XlDCVH5lnewDN/519Fv0vrsFszXhX1+u4yKu9JyRVLTeeULBaef3IDlaAf2',
  'C87KO56+eHPIZVblTxwRv3jt6yyj+ATQdJtxXoMWZ7Ja21+8/m2MUU7IyQeqrHrvy2KP0Z+d5zR6',
  'HR/caJidANaLFqxbri94ZwOaJVG1U27Rm47ik/oRQv4Lz2GF/RZVOpYAAAAASUVORK5CYII=',
].join('');

/** Le logo en Blob, ou null hors de Google. */
function logoEmail_() {
  try {
    return Utilities.newBlob(
      Utilities.base64Decode(LOGO_EMAIL_BASE64), 'image/png',
      'tenderpilot.png').setName('tenderpilot.png');
  } catch (e) {
    // Utilities n'existe pas hors d'Apps Script : un email sans
    // logo reste un email complet.
    return null;
  }
}

if (typeof module !== 'undefined') {
  module.exports = { LOGO_EMAIL_BASE64: LOGO_EMAIL_BASE64,
                     logoEmail_: logoEmail_ };
}
