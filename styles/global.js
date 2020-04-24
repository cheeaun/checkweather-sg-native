import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  flex: {
    flex: 1,
  },
  relative: {
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  col: {
    flexDirection: 'column',
  },
  grow: {
    flexGrow: 1,
  },
  mapCorner: {
    position: 'absolute',
    padding: 10,
  },
  mapCornerTopRight: {
    top: 0,
    right: 0,
  },
  mapCornerBottom: {
    bottom: 0,
    left: 0,
    width: '100%',
  },
  mapCornerBottomRight: {
    bottom: 0,
    right: 0,
  },
  text: {
    color: '#fff',
  },
  textSmall: {
    fontSize: 13,
  },
  textLarge: {
    fontSize: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  button: {
    backgroundColor: 'rgba(255,255,255,.5)',
    padding: 10,
    borderRadius: 10,
  },
  player: {
    // backgroundColor: 'rgba(24, 24, 24, 0.9)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 28,
    maxWidth: 480,
  },
  playButton: {
    marginRight: 20,
    backgroundColor: 'rgba(255,255,255,.1)',
    padding: 16,
    borderRadius: 40,
    width: 16 * 3,
    height: 16 * 3,
  },
  playIcon: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
    marginLeft: 2,
  },
  pauseIcon: {
    width: 16,
    height: 16,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderRightWidth: 6,
    borderLeftWidth: 6,
    borderColor: '#fff',
  },
  forwardIcon: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
    shadowOffset: { width: 8, height: 0 },
    shadowColor: '#fff',
    shadowRadius: 0,
    shadowOpacity: 1,
    marginRight: 8,
    transform: [{ translateX: 1 }],
  },
  label: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 123,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(0,0,0,.2)',
    transform: [{ translateX: -2 }],
  },
  labelText: {
    textTransform: 'uppercase',
    fontSize: 12,
    lineHeight: 16,
  },
  gradientBlock: {
    backgroundColor: 'rgba(255,255,255,.6)',
    borderRadius: 12,
    paddingHorizontal: 6,
  },
  lineDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,.3)',
    marginVertical: 8,
  },
  largeDivider: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,.2)',
  },
});
