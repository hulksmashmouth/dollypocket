import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { listModels, OllamaError } from '../api/ollama';
import { bevel, blockFont, colors } from '../theme';

interface Props {
  baseUrl: string;
  value: string;
  onChange: (model: string) => void;
}

type Status = 'loading' | 'ok' | 'error';

// Replaces the old free-text Model field: fetches whatever's actually
// installed on the Ollama server and lets the user pick from a real list
// instead of typing a model name that may or may not exist.
export function ModelPicker({ baseUrl, value, onChange }: Props) {
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const list = await listModels(baseUrl);
      setModels(list);
      setStatus('ok');
    } catch (err) {
      setStatus('error');
      setError(err instanceof OllamaError ? err.message : 'Could not connect.');
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Model</Text>
        <Pressable style={styles.refreshButton} onPress={fetchModels}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      <View style={styles.listBox}>
        {status === 'loading' && <ActivityIndicator color={colors.textPrimary} style={styles.spinner} />}

        {status === 'error' && <Text style={styles.errorText}>{error}</Text>}

        {status === 'ok' && models.length === 0 && (
          <Text style={styles.errorText}>No models installed on this server.</Text>
        )}

        {status === 'ok' &&
          models.map((m) => {
            const selected = m === value;
            return (
              <Pressable
                key={m}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => onChange(m)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{m}</Text>
              </Pressable>
            );
          })}

        {/* If the server's unreachable or the list hasn't loaded, still show
            whatever model is currently configured so it's never blank. */}
        {status !== 'ok' && !!value && (
          <View style={[styles.option, styles.optionSelected]}>
            <Text style={styles.optionTextSelected}>{value} (current)</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: blockFont,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  refreshButton: {
    backgroundColor: colors.panelBg,
    borderWidth: bevel.width,
    ...bevel.raised,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  refreshText: {
    fontFamily: blockFont,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  listBox: {
    marginTop: 6,
    backgroundColor: colors.inputBg,
    borderWidth: bevel.width,
    ...bevel.sunken,
    padding: 6,
  },
  spinner: {
    marginVertical: 8,
  },
  errorText: {
    fontFamily: blockFont,
    color: colors.error,
    fontSize: 13,
    padding: 6,
  },
  option: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  optionSelected: {
    backgroundColor: colors.accent,
  },
  optionText: {
    fontFamily: blockFont,
    fontSize: 15,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    fontWeight: '700',
  },
});
