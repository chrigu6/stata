import webapp2
import urllib2

class MainPage(webapp2.RequestHandler):

	def get(self):
		self.response.headers['Content-Type'] = 'text/plain'
		#Opens the overview of all the games on a specific day
		answer = urllib2.urlopen('http://www.easportsworld.com/en_US/clubs/partial/401A0001/744/match-results?type=all&timestamp=1375630842', timeout=60)
		#Opens a specific game specified by the gameID
		game = urllib2.urlopen('http://www.easportsworld.com/en_US/clubs/partial/401A0001/744/match-results/details?match_id=36028797070454350', timeout = 60)
		self.response.write(game.read())


application = webapp2.WSGIApplication([
	('/', MainPage),
], debug=True)
